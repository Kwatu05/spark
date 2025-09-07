import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, CheckCircle2, Megaphone, Gauge, Users, Wrench, Activity, LineChart, ServerCog, Plus, Trash2, RefreshCcw, User, Crown, LogOut, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { api } from '../lib/api';
import QueueDashboard from './QueueDashboard';

type QueueItem = { id: string; type: 'post' | 'comment' | 'user'; reason: string; reportedAt: string };
type Banner = { active: boolean; message: string };
type FeatureFlag = { key: string; enabled: boolean; description: string; rolloutPercentage: number };
type DashboardStats = {
  users: { total: number; active: number; newToday: number };
  posts: { total: number; today: number };
  analytics: { totalEvents: number; topEvents: Array<{ event: string; count: number }> };
  system: { uptime: number; requestsTotal: number; errorsTotal: number; avgResponseTime: number };
};

type AdminTab = 'dashboard' | 'featureFlags' | 'users' | 'infrastructure' | 'security' | 'analytics' | 'system' | 'moderation' | 'banner' | 'approvals' | 'reports' | 'groups' | 'events' | 'premium' | 'queues';

export const AdminConsole: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [currentUserRole, setCurrentUserRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{username: string; email: string; role: string; lastLogin?: string} | null>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [approvalsType, setApprovalsType] = useState<'verifications'>('verifications');
  const [approvals, setApprovals] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [mgmtEvents, setMgmtEvents] = useState<any[]>([]);
  const [premium, setPremium] = useState<Record<string, { plan: 'GOLD' | 'PLATINUM'; grantedAt: string }>>({});
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '' });
  const [premiumGrant, setPremiumGrant] = useState({ userId: '', plan: 'GOLD' as 'GOLD' | 'PLATINUM' });
  const [banner, setBanner] = useState<Banner>({ active: false, message: '' });
  const [savingBanner, setSavingBanner] = useState(false);

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [newFlag, setNewFlag] = useState<FeatureFlag>({ key: '', enabled: false, description: '', rolloutPercentage: 0 });

  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'USER' as 'USER' | 'MODERATOR' | 'ADMIN'
  });

  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [eventSummary, setEventSummary] = useState<Array<{ event: string; count: number }>>([]);
  const [eventFilter, setEventFilter] = useState({ event: '', userId: '', startDate: '', endDate: '' });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Load admin profile information
  const loadAdminProfile = async () => {
    try {
      const response = await api.get<{ ok: boolean; user?: { username: string; email: string; role: string; lastLogin?: string } }>('/auth/session');
      if (response?.ok && response.user) {
        setCurrentUserRole(response.user.role as 'USER' | 'MODERATOR' | 'ADMIN');
        setAdminProfile({
          username: response.user.username,
          email: response.user.email,
          role: response.user.role,
          lastLogin: response.user.lastLogin
        });
      }
    } catch (error) {
      console.error('Failed to load admin profile:', error);
    }
  };

  // Initial loads for dashboard
  useEffect(() => {
    loadAdminProfile();
    
    // Dashboard
    api.get<{ ok: boolean; stats: DashboardStats }>(`/admin/dashboard`).then(d => { if (d?.ok) setStats(d.stats); }).catch(() => {});
    // Banner
    api.get<{ ok: boolean; banner: Banner }>(`/admin/outage-banner`).then((d) => { if (d?.ok) setBanner(d.banner); }).catch(() => {});
    // Moderation
    api.get<{ ok: boolean; items: QueueItem[] }>(`/admin/moderation/queue`).then((d) => { if (d?.ok) setQueue(d.items); }).catch(() => {});
    // Feature Flags
    api.get<{ ok: boolean; flags: FeatureFlag[] }>(`/admin/feature-flags`).then((d) => { if (d?.ok) setFlags(d.flags); }).catch(() => {});
    // Approvals
    loadApprovals('verifications');
    loadReports();
    loadGroups();
    loadEvents();
    loadPremium();
    // Users
    loadUsers(1, userSearch, '');
    // Analytics
    loadAnalytics();
    // System
    loadSystem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async (page = 1, search = '', role = '') => {
    try {
      const q = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) q.set('search', search);
      if (role) q.set('role', role);
      const d = await api.get<{ ok: boolean; users: any[]; pagination: { pages: number } }>(`/admin/users?${q.toString()}`);
      if (d?.ok) {
        setUsers(d.users);
        setUserPages(d.pagination.pages);
        setUserPage(page);
      }
    } catch {}
  };

  const loadApprovals = async (type: 'verifications') => {
    try {
      const d = await api.get<{ ok: boolean; items: any[] }>(`/admin/approvals/${type}`);
      if (d?.ok) { setApprovalsType(type); setApprovals(d.items); }
    } catch {}
  };

  const approveItem = async (id: string) => {
    setApprovals(a => a.filter(x => x.id !== id));
    try { await api.post(`/admin/approvals/${approvalsType}/${id}/approve`); } catch {}
  };

  const rejectItem = async (id: string) => {
    setApprovals(a => a.filter(x => x.id !== id));
    try { await api.post(`/admin/approvals/${approvalsType}/${id}/reject`, { reason: 'Not compliant' }); } catch {}
  };

  const loadReports = async () => {
    try { const d = await api.get<{ ok: boolean; items: any[] }>(`/admin/reports`); if (d?.ok) setReports(d.items); } catch {}
  };
  const resolveReport = async (id: string, action = 'dismiss') => {
    setReports(r => r.filter(x => x.id !== id));
    try { await api.post(`/admin/reports/${id}/resolve`, { action }); } catch {}
  };

  const loadGroups = async () => {
    try { const d = await api.get<{ ok: boolean; groups: any[] }>(`/admin/groups`); if (d?.ok) setGroups(d.groups); } catch {}
  };
  const addGroup = async () => {
    if (!newGroup.name.trim()) return;
    try { const d = await api.post<{ ok: boolean; group: any }>(`/admin/groups`, newGroup); if (d?.ok) { setGroups(g => [d.group, ...g]); setNewGroup({ name: '', description: '' }); } } catch {}
  };
  const removeGroup = async (id: string) => {
    setGroups(g => g.filter(x => x.id !== id));
    try { await api.delete(`/admin/groups/${id}`); } catch {}
  };
  const removeGroupMember = async (groupId: string, userId: string) => {
    try { const d = await api.post<{ ok: boolean; group: any }>(`/admin/groups/${groupId}/members/${userId}/remove`); if (d?.ok) setGroups(gs => gs.map(g => g.id===groupId? d.group : g)); } catch {}
  };

  const loadEvents = async () => {
    try { const d = await api.get<{ ok: boolean; events: any[] }>(`/admin/events`); if (d?.ok) setMgmtEvents(d.events); } catch {}
  };
  const addEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    try { const d = await api.post<{ ok: boolean; event: any }>(`/admin/events`, newEvent); if (d?.ok) { setMgmtEvents(ev => [d.event, ...ev]); setNewEvent({ title: '', description: '', date: '' }); } } catch {}
  };
  const removeEvent = async (id: string) => {
    setMgmtEvents(ev => ev.filter(x => x.id !== id));
    try { await api.delete(`/admin/events/${id}`); } catch {}
  };
  const removeEventAttendee = async (eventId: string, userId: string) => {
    try { const d = await api.post<{ ok: boolean; event: any }>(`/admin/events/${eventId}/attendees/${userId}/remove`); if (d?.ok) setMgmtEvents(es => es.map(e => e.id===eventId? d.event : e)); } catch {}
  };

  const loadPremium = async () => {
    try { const d = await api.get<{ ok: boolean; users: Record<string, { plan: 'GOLD'|'PLATINUM'; grantedAt: string }> }>(`/admin/premium`); if (d?.ok) setPremium(d.users); } catch {}
  };
  const grantPremium = async () => {
    if (!premiumGrant.userId.trim()) return;
    try { await api.post(`/admin/premium/grant`, premiumGrant); await loadPremium(); setPremiumGrant({ userId: '', plan: 'GOLD' }); } catch {}
  };
  const revokePremium = async (userId: string) => {
    try { await api.post(`/admin/premium/revoke`, { userId }); await loadPremium(); } catch {}
  };

  const updateUser = async (id: string, updates: { role?: string; isVerified?: boolean }) => {
    try {
      const d = await api.patch<{ ok: boolean; user: any }>(`/admin/users/${id}`, updates);
      if (d?.ok) setUsers(u => u.map(x => x.id === id ? { ...x, ...updates } : x));
    } catch {}
  };


  const resolveItem = async (id: string) => {
    setQueue(q => q.filter(i => i.id !== id));
    try { await api.post(`/admin/moderation/resolve/${id}`); } catch {}
  };

  const saveBanner = async () => {
    setSavingBanner(true);
    try { await api.post(`/admin/outage-banner`, banner); } catch {}
    setSavingBanner(false);
  };

  const saveFeatureFlag = async () => {
    if (!newFlag.key.trim()) return;
    try {
      const d = await api.post<{ ok: boolean; flags: FeatureFlag[] }>(`/admin/feature-flags`, newFlag);
      if (d?.ok) {
        setFlags(d.flags);
        setNewFlag({ key: '', enabled: false, description: '', rolloutPercentage: 0 });
      }
    } catch {}
  };

  const deleteFeatureFlag = async (key: string) => {
    try {
      const d = await api.delete<{ ok: boolean; flags: FeatureFlag[] }>(`/admin/feature-flags/${encodeURIComponent(key)}`);
      if (d?.ok) setFlags(d.flags);
    } catch {}
  };

  const loadAnalytics = async () => {
    try {
      const q = new URLSearchParams();
      if (eventFilter.event) q.set('event', eventFilter.event);
      if (eventFilter.userId) q.set('userId', eventFilter.userId);
      if (eventFilter.startDate) q.set('startDate', eventFilter.startDate);
      if (eventFilter.endDate) q.set('endDate', eventFilter.endDate);
      const d = await api.get<{ ok: boolean; events: any[]; summary: Array<{ event: string; count: number }> }>(`/admin/analytics?${q.toString()}`);
      if (d?.ok) { setAnalyticsEvents(d.events); setEventSummary(d.summary); }
    } catch {}
  };

  const loadSystem = async () => {
    try {
      const h = await api.get<{ ok: boolean; health: any }>(`/admin/system/health`);
      if (h?.ok) setHealth(h.health);
      const l = await api.get<{ ok: boolean; logs: any[] }>(`/admin/system/logs?limit=100`);
      if (l?.ok) setLogs(l.logs);
    } catch {}
  };

  const uptimeHuman = useMemo(() => {
    if (!stats?.system.uptime) return '—';
    const s = stats.system.uptime;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }, [stats]);

  // Show access denied if not admin/moderator
  if (currentUserRole === 'USER') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-500" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800">You need admin or moderator privileges to access this console.</p>
          <p className="text-red-600 text-sm mt-2">Current role: {currentUserRole}</p>
        </div>
      </div>
    );
  }

  // Get admin privileges based on role
  const getAdminPrivileges = (role: string) => {
    const privileges = {
      ADMIN: [
        'Platform Infrastructure Management',
        'Database & Backend Systems',
        'User Account Management',
        'Technical Issue Resolution',
        'Security & Fraud Detection',
        'Content Moderation & Enforcement',
        'Ad & Payment System Configuration',
        'Software Updates & Patches',
        'Performance Analysis & Logs',
        'Technical Support Escalation',
        'Internal Access Auditing'
      ],
      MODERATOR: [
        'Content Moderation',
        'User Verification',
        'Report Handling',
        'Basic Analytics',
        'Community Management'
      ],
      USER: [
        'Profile Management',
        'Content Creation',
        'Social Interactions',
        'Groups & Pages',
        'Events & Live Streaming',
        'Messaging & Privacy'
      ]
    };
    return privileges[role as keyof typeof privileges] || privileges.USER;
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge, adminOnly: false },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
    { id: 'infrastructure', label: 'Infrastructure', icon: ServerCog, adminOnly: true },
    { id: 'security', label: 'Security & Fraud', icon: ShieldAlert, adminOnly: true },
    { id: 'moderation', label: 'Content Moderation', icon: CheckCircle2, adminOnly: false },
    { id: 'analytics', label: 'Performance Analytics', icon: LineChart, adminOnly: false },
    { id: 'system', label: 'System Monitoring', icon: Activity, adminOnly: true },
    { id: 'queues', label: 'Queue Management', icon: Database, adminOnly: true },
    { id: 'featureFlags', label: 'Feature Flags', icon: Wrench, adminOnly: true },
    { id: 'banner', label: 'Outage Banner', icon: Megaphone, adminOnly: true },
    { id: 'approvals', label: 'Verifications', icon: CheckCircle2, adminOnly: false },
    { id: 'reports', label: 'Reports & Safety', icon: ShieldAlert, adminOnly: false },
    { id: 'groups', label: 'Groups', icon: Users, adminOnly: false },
    { id: 'events', label: 'Events', icon: Activity, adminOnly: false },
    { id: 'premium', label: 'Premium Management', icon: Wrench, adminOnly: true },
  ];

  const handleLogout = () => {
    localStorage.removeItem('spark_session');
    localStorage.removeItem('access_token');
    window.location.href = '/';
  };

  // User management functions
  const createUser = async () => {
    try {
      const response = await api.post<{ok: boolean; error?: string}>('/admin/users', newUser);
      if (response.ok) {
        setShowAddUser(false);
        setNewUser({ username: '', email: '', password: '', fullName: '', role: 'USER' });
        loadUsers(userPage, userSearch, userRole);
        alert('User created successfully!');
      } else {
        alert('Failed to create user: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to create user: ' + error);
    }
  };

  const deleteUserAccount = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await api.delete<{ok: boolean; error?: string}>(`/admin/users/${userId}`);
      if (response.ok) {
        loadUsers(userPage, userSearch, userRole);
        alert('User deleted successfully!');
      } else {
        alert('Failed to delete user: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to delete user: ' + error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg min-h-screen transition-all duration-300 ease-in-out relative`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-coral" size={24} />
                  <div>
                    <h1 className="text-lg font-bold">Admin Console</h1>
                    <span className="px-2 py-1 bg-coral text-white text-xs rounded-full">{currentUserRole}</span>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="p-4 space-y-2 flex-1">
            {navigationItems
              .filter(item => !item.adminOnly || currentUserRole === 'ADMIN')
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === item.id
                        ? 'bg-coral text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} />
                    {!sidebarCollapsed && item.label}
                  </button>
                );
              })}
          </nav>

          {/* Logout Button */}
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors`}
              title={sidebarCollapsed ? 'Logout' : undefined}
            >
              <LogOut size={18} />
              {!sidebarCollapsed && 'Logout'}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Header with Admin Profile */}
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">{tab.replace(/([A-Z])/g, ' $1').trim()}</h2>
                <p className="text-sm text-gray-500">Manage your platform</p>
              </div>
              
              {/* Admin Profile in Top Right */}
              {adminProfile && (
                <div className="flex items-center gap-4">
                  {/* Admin Privileges Summary */}
                  <div className="hidden md:block bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-xs text-gray-600">
                      {getAdminPrivileges(adminProfile.role).length} privileges
                    </div>
                  </div>
                  
                  {/* Admin Profile */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-coral rounded-full flex items-center justify-center">
                      <User className="text-white" size={20} />
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{adminProfile.username}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Crown className="text-yellow-500" size={12} />
                        {adminProfile.role}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">

      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-3">Overview</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Users Total</div>
                <div className="text-xl font-semibold">{stats?.users.total ?? '—'}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Active (24h)</div>
                <div className="text-xl font-semibold">{stats?.users.active ?? '—'}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">New Today</div>
                <div className="text-xl font-semibold">{stats?.users.newToday ?? '—'}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Posts Today</div>
                <div className="text-xl font-semibold">{stats?.posts.today ?? '—'}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Events</div>
                <div className="text-xl font-semibold">{stats?.analytics.totalEvents ?? '—'}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="text-gray-500">Uptime</div>
                <div className="text-xl font-semibold">{uptimeHuman}</div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-medium mb-2">Top Events</h3>
              <ul className="text-sm space-y-1">
                {stats?.analytics.topEvents.map(e => (
                  <li key={e.event} className="flex justify-between"><span>{e.event}</span><span>{e.count}</span></li>
                )) || <li className="text-gray-500">No data</li>}
              </ul>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTab('featureFlags')} className="px-3 py-2 bg-gray-100 rounded-lg">Manage Feature Flags</button>
              <button onClick={() => setTab('users')} className="px-3 py-2 bg-gray-100 rounded-lg">Manage Users</button>
              <button onClick={() => { loadAnalytics(); setTab('analytics'); }} className="px-3 py-2 bg-gray-100 rounded-lg">View Analytics</button>
              <button onClick={() => { loadSystem(); setTab('system'); }} className="px-3 py-2 bg-gray-100 rounded-lg">System Health</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'featureFlags' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Wrench />
            <h2 className="font-semibold">Feature Flags</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={newFlag.key} onChange={e => setNewFlag({ ...newFlag, key: e.target.value })} placeholder="key" className="px-3 py-2 border rounded-lg" />
              <input value={newFlag.description} onChange={e => setNewFlag({ ...newFlag, description: e.target.value })} placeholder="description" className="px-3 py-2 border rounded-lg" />
              <input type="number" value={newFlag.rolloutPercentage} onChange={e => setNewFlag({ ...newFlag, rolloutPercentage: Number(e.target.value) })} placeholder="rollout %" className="px-3 py-2 border rounded-lg" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={newFlag.enabled} onChange={e => setNewFlag({ ...newFlag, enabled: e.target.checked })} /> Enabled</label>
            </div>
            <button onClick={saveFeatureFlag} className="px-3 py-2 bg-coral text-white rounded-full inline-flex items-center gap-1"><Plus size={16}/> Add / Update</button>
            <div className="divide-y">
              {flags.map(f => (
                <div key={f.key} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.key}</div>
                    <div className="text-sm text-gray-500">{f.description} · Rollout {f.rolloutPercentage}% · {f.enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <button onClick={() => deleteFeatureFlag(f.key)} className="px-3 py-1 bg-red-600 text-white rounded-full text-sm inline-flex items-center gap-1"><Trash2 size={16}/> Remove</button>
                </div>
              ))}
              {flags.length === 0 && <div className="p-6 text-center text-gray-500">No flags</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'infrastructure' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <ServerCog />
              <h2 className="font-semibold">Platform Infrastructure</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Database Management</h3>
                  <p className="text-sm text-gray-600 mb-3">Manage database connections, backups, and performance</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Connection Pool</span>
                      <span className="text-green-600">Healthy</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Backup</span>
                      <span className="text-gray-600">2 hours ago</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Query Performance</span>
                      <span className="text-green-600">Optimal</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Backend Systems</h3>
                  <p className="text-sm text-gray-600 mb-3">Monitor API endpoints and service health</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>API Response Time</span>
                      <span className="text-green-600">45ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Error Rate</span>
                      <span className="text-green-600">0.1%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Active Connections</span>
                      <span className="text-gray-600">1,247</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Software Updates</h3>
                  <p className="text-sm text-gray-600 mb-3">Deploy patches and system updates</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pending Updates</span>
                      <span className="text-yellow-600">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Deployment</span>
                      <span className="text-gray-600">Yesterday</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>System Version</span>
                      <span className="text-gray-600">v2.1.4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <ShieldAlert />
              <h2 className="font-semibold">Security & Fraud Detection</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-medium text-red-900 mb-2">Threat Detection</h3>
                  <p className="text-sm text-red-700 mb-3">Monitor for suspicious activities and fraud</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Threats</span>
                      <span className="text-red-600 font-medium">2</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Blocked IPs</span>
                      <span className="text-red-600">47</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Fraud Attempts</span>
                      <span className="text-red-600">12</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">Access Control</h3>
                  <p className="text-sm text-blue-700 mb-3">Manage user permissions and access levels</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Admin Sessions</span>
                      <span className="text-blue-600">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Failed Logins</span>
                      <span className="text-blue-600">8</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>2FA Enabled</span>
                      <span className="text-green-600">95%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-medium text-green-900 mb-2">Security Audit</h3>
                  <p className="text-sm text-green-700 mb-3">Track security events and compliance</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Last Audit</span>
                      <span className="text-green-600">Today</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Compliance Score</span>
                      <span className="text-green-600">98%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Security Events</span>
                      <span className="text-green-600">Low</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          {/* Add User Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users />
                <h2 className="font-semibold">User Management</h2>
              </div>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors"
              >
                {showAddUser ? 'Cancel' : 'Add New User'}
              </button>
            </div>
            
            {showAddUser && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium mb-3">Create New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Username"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Email"
                    type="email"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    value={newUser.fullName}
                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                    placeholder="Full Name"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Password"
                    type="password"
                    className="px-3 py-2 border rounded-lg"
                  />
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value as 'USER' | 'MODERATOR' | 'ADMIN' })}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button
                    onClick={createUser}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Create User
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Users List */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold">All Users</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="px-3 py-2 border rounded-lg" />
                <select value={userRole} onChange={e => setUserRole(e.target.value)} className="px-3 py-2 border rounded-lg">
                  <option value="">All Roles</option>
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <button onClick={() => loadUsers(1, userSearch, userRole)} className="px-3 py-2 bg-gray-100 rounded-lg inline-flex items-center gap-1"><RefreshCcw size={16}/> Apply</button>
              </div>
              <div className="divide-y">
                {users.map(u => (
                  <div key={u.id} className="py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{u.username || u.email}</div>
                      <div className="text-sm text-gray-500">{u.email} · Posts {u._count?.posts ?? 0} · {new Date(u.createdAt).toLocaleDateString()}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                          u.role === 'MODERATOR' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                        {u.isVerified && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })} className="px-2 py-1 border rounded-lg text-sm">
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <label className="text-sm flex items-center gap-1">
                        <input type="checkbox" checked={u.isVerified} onChange={e => updateUser(u.id, { isVerified: e.target.checked })} />
                        Verified
                      </label>
                      <button 
                        onClick={() => deleteUserAccount(u.id)} 
                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && <div className="p-6 text-center text-gray-500">No users found</div>}
              </div>
              <div className="flex items-center justify-between pt-2">
                <button disabled={userPage<=1} onClick={() => loadUsers(userPage-1, userSearch, userRole)} className="px-3 py-1 bg-gray-100 rounded-full disabled:opacity-50">Prev</button>
                <div className="text-sm text-gray-600">Page {userPage} / {userPages}</div>
                <button disabled={userPage>=userPages} onClick={() => loadUsers(userPage+1, userSearch, userRole)} className="px-3 py-1 bg-gray-100 rounded-full disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <LineChart />
            <h2 className="font-semibold">Analytics</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={eventFilter.event} onChange={e => setEventFilter({ ...eventFilter, event: e.target.value })} placeholder="Event" className="px-3 py-2 border rounded-lg" />
              <input value={eventFilter.userId} onChange={e => setEventFilter({ ...eventFilter, userId: e.target.value })} placeholder="User ID" className="px-3 py-2 border rounded-lg" />
              <input type="date" value={eventFilter.startDate} onChange={e => setEventFilter({ ...eventFilter, startDate: e.target.value })} className="px-3 py-2 border rounded-lg" />
              <input type="date" value={eventFilter.endDate} onChange={e => setEventFilter({ ...eventFilter, endDate: e.target.value })} className="px-3 py-2 border rounded-lg" />
            </div>
            <button onClick={loadAnalytics} className="px-3 py-2 bg-gray-100 rounded-lg inline-flex items-center gap-1"><RefreshCcw size={16}/> Apply</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Recent Events</h3>
                <div className="max-h-64 overflow-auto border rounded-lg">
                  {analyticsEvents.map((e, i) => (
                    <div key={i} className="px-3 py-2 text-sm border-b last:border-b-0">
                      <div className="font-medium">{e.event}</div>
                      <div className="text-gray-500">{new Date(e.timestamp).toLocaleString()} · {e.userId || 'anon'}</div>
                    </div>
                  ))}
                  {analyticsEvents.length === 0 && <div className="p-6 text-center text-gray-500">No events</div>}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Summary</h3>
                <div className="border rounded-lg">
                  {eventSummary.map(s => (
                    <div key={s.event} className="px-3 py-2 text-sm border-b last:border-b-0 flex justify-between"><span>{s.event}</span><span>{s.count}</span></div>
                  ))}
                  {eventSummary.length === 0 && <div className="p-6 text-center text-gray-500">No summary</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ServerCog />
            <h2 className="font-semibold">System Health & Logs</h2>
          </div>
          <div className="p-4 space-y-4">
            <button onClick={loadSystem} className="px-3 py-2 bg-gray-100 rounded-lg inline-flex items-center gap-1"><RefreshCcw size={16}/> Refresh</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 text-sm">
                <div className="font-medium mb-2">Health</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Uptime</div><div className="text-right">{health ? `${health.uptime}s` : '—'}</div>
                  <div>Requests</div><div className="text-right">{health?.requestsTotal ?? '—'}</div>
                  <div>Errors</div><div className="text-right">{health?.errorsTotal ?? '—'}</div>
                  <div>Error Rate</div><div className="text-right">{health?.errorRate ?? '—'}%</div>
                  <div>Avg Resp (ms)</div><div className="text-right">{health?.avgResponseTime ?? '—'}</div>
                </div>
              </div>
              <div className="border rounded-lg p-3 text-sm">
                <div className="font-medium mb-2">Recent Logs</div>
                <div className="max-h-64 overflow-auto">
                  {logs.map((l, i) => (
                    <div key={i} className="border-b last:border-b-0 py-1"><span className="uppercase text-xs mr-2">{l.level}</span>{l.message}<span className="text-gray-500 text-xs ml-2">{l.timestamp}</span></div>
                  ))}
                  {logs.length === 0 && <div className="p-6 text-center text-gray-500">No logs</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'queues' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Database />
            <h2 className="font-semibold">Queue Management</h2>
          </div>
          <div className="p-4">
            <QueueDashboard />
          </div>
        </div>
      )}

      {tab === 'banner' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Megaphone />
            <h2 className="font-semibold">Outage Banner</h2>
          </div>
          <div className="p-4 space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={banner.active} onChange={(e) => setBanner({ ...banner, active: e.target.checked })} />
              <span>Active</span>
            </label>
            <input
              value={banner.message}
              onChange={(e) => setBanner({ ...banner, message: e.target.value })}
              placeholder="e.g., We are investigating elevated error rates"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <button onClick={saveBanner} disabled={savingBanner} className="px-4 py-2 bg-coral text-white rounded-full disabled:opacity-60">
              {savingBanner ? 'Saving…' : 'Save' }
            </button>
          </div>
        </div>
      )}

      {tab === 'moderation' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Activity />
            <h2 className="font-semibold">Moderation Queue</h2>
            <span className="text-sm text-gray-500">{queue.length} items</span>
          </div>
          <div className="divide-y">
            {queue.map(item => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{item.type.toUpperCase()} · {item.reason}</div>
                  <div className="text-sm text-gray-500">Reported {new Date(item.reportedAt).toLocaleString()}</div>
                </div>
                <button onClick={() => resolveItem(item.id)} className="px-3 py-1 bg-green-600 text-white rounded-full text-sm flex items-center gap-1">
                  <CheckCircle2 size={16} /> Resolve
                </button>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="p-6 text-center text-gray-500">No items in the queue</div>
            )}
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle2 />
            <h2 className="font-semibold">Approvals</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => loadApprovals('verifications')} className={`px-3 py-1 rounded-full text-sm ${approvalsType==='verifications'?'bg-coral text-white':'bg-gray-100'}`}>verifications</button>
              <button onClick={() => loadApprovals(approvalsType)} className="px-3 py-1 bg-gray-100 rounded-full inline-flex items-center gap-1"><RefreshCcw size={16}/> Refresh</button>
            </div>
            <div className="divide-y">
              {approvals.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.id} · by {item.submittedBy}</div>
                    <div className="text-sm text-gray-500">{new Date(item.submittedAt).toLocaleString()}</div>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">{JSON.stringify(item.data, null, 2)}</pre>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => approveItem(item.id)} className="px-3 py-1 bg-green-600 text-white rounded-full text-sm">Approve</button>
                    <button onClick={() => rejectItem(item.id)} className="px-3 py-1 bg-red-600 text-white rounded-full text-sm">Reject</button>
                  </div>
                </div>
              ))}
              {approvals.length === 0 && <div className="p-6 text-center text-gray-500">No items</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldAlert />
            <h2 className="font-semibold">Reports & Safety</h2>
          </div>
          <div className="divide-y">
            {reports.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.targetType} · {r.targetId}</div>
                  <div className="text-sm text-gray-500">{r.reason} · by {r.reportedBy} · {new Date(r.reportedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => resolveReport(r.id, 'action_taken')} className="px-3 py-1 bg-green-600 text-white rounded-full text-sm">Action</button>
                  <button onClick={() => resolveReport(r.id, 'dismiss')} className="px-3 py-1 bg-gray-200 rounded-full text-sm">Dismiss</button>
                </div>
              </div>
            ))}
            {reports.length === 0 && <div className="p-6 text-center text-gray-500">No reports</div>}
          </div>
        </div>
      )}

      {tab === 'groups' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Users />
            <h2 className="font-semibold">Groups</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Group name" className="px-3 py-2 border rounded-lg" />
              <input value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="Description" className="px-3 py-2 border rounded-lg" />
              <button onClick={addGroup} className="px-3 py-2 bg-coral text-white rounded-full">Add Group</button>
            </div>
            <div className="divide-y">
              {groups.map(g => (
                <div key={g.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-sm text-gray-500">Members {g.members?.length ?? 0}</div>
                    </div>
                    <button onClick={() => removeGroup(g.id)} className="px-3 py-1 bg-red-600 text-white rounded-full text-sm">Delete</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {g.members?.map((m: string) => (
                      <span key={m} className="px-2 py-1 bg-gray-100 rounded-full inline-flex items-center gap-2">{m}<button onClick={() => removeGroupMember(g.id, m)} className="text-red-600">×</button></span>
                    ))}
                    {(!g.members || g.members.length===0) && <span className="text-gray-500">No members</span>}
                  </div>
                </div>
              ))}
              {groups.length === 0 && <div className="p-6 text-center text-gray-500">No groups</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Activity />
            <h2 className="font-semibold">Events</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Title" className="px-3 py-2 border rounded-lg" />
              <input value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Description" className="px-3 py-2 border rounded-lg" />
              <input type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="px-3 py-2 border rounded-lg" />
              <button onClick={addEvent} className="px-3 py-2 bg-coral text-white rounded-full">Add Event</button>
            </div>
            <div className="divide-y">
              {mgmtEvents.map(ev => (
                <div key={ev.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-gray-500">Attendees {ev.attendees?.length ?? 0} · {new Date(ev.date).toLocaleString()}</div>
                    </div>
                    <button onClick={() => removeEvent(ev.id)} className="px-3 py-1 bg-red-600 text-white rounded-full text-sm">Delete</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {ev.attendees?.map((m: string) => (
                      <span key={m} className="px-2 py-1 bg-gray-100 rounded-full inline-flex items-center gap-2">{m}<button onClick={() => removeEventAttendee(ev.id, m)} className="text-red-600">×</button></span>
                    ))}
                    {(!ev.attendees || ev.attendees.length===0) && <span className="text-gray-500">No attendees</span>}
                  </div>
                </div>
              ))}
              {mgmtEvents.length === 0 && <div className="p-6 text-center text-gray-500">No events</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'premium' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Wrench />
            <h2 className="font-semibold">Premium</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={premiumGrant.userId} onChange={e => setPremiumGrant({ ...premiumGrant, userId: e.target.value })} placeholder="User ID" className="px-3 py-2 border rounded-lg" />
              <select value={premiumGrant.plan} onChange={e => setPremiumGrant({ ...premiumGrant, plan: e.target.value as any })} className="px-3 py-2 border rounded-lg">
                <option value="GOLD">GOLD</option>
                <option value="PLATINUM">PLATINUM</option>
              </select>
              <button onClick={grantPremium} className="px-3 py-2 bg-coral text-white rounded-full">Grant</button>
            </div>
            <div className="border rounded-lg divide-y">
              {Object.entries(premium).map(([userId, info]) => (
                <div key={userId} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{userId}</div>
                    <div className="text-gray-500">{info.plan} · {new Date(info.grantedAt).toLocaleString()}</div>
                  </div>
                  <button onClick={() => revokePremium(userId)} className="px-3 py-1 bg-red-600 text-white rounded-full">Revoke</button>
                </div>
              ))}
              {Object.keys(premium).length === 0 && <div className="p-6 text-center text-gray-500">No premium users</div>}
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
};


