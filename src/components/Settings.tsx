import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Heart, 
  Eye, 
  MessageCircle, 
  Trash2,
  LogOut,
  ChevronRight,
  Sparkles,
  Bookmark,
  Users,
  Globe,
  Lock,
  Crown
} from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { locale, setLocale, timezone, setTimezone, t } = useI18n();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    notifications: {
      sparks: true,
      messages: true,
      connections: true,
      posts: false
    },
    privacy: {
      showAge: true,
      showLocation: true,
      showOnline: true,
      allowMessages: true,
      incognito: false,
      showDistance: true,
      messageMode: 'everyone' as 'everyone' | 'connections' | 'none'
    },
    discovery: {
      ageRange: [22, 35],
      maxDistance: 50,
      showMe: 'everyone'
    },
    profilePrivacy: {
      reposts: 'public' as 'public' | 'private' | 'friends',
      savedBoards: 'private' as 'public' | 'private' | 'friends',
      collections: 'public' as 'public' | 'private' | 'friends',
      profileStats: 'public' as 'public' | 'private' | 'friends'
    }
  });

  // Load persisted settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem('app_privacy_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist settings on change
  useEffect(() => {
    try { localStorage.setItem('app_privacy_settings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  const toggleSetting = (section: keyof typeof settings, key: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key as keyof typeof prev[typeof section]]
      }
    }));
  };

  const updateProfilePrivacy = (key: keyof typeof settings.profilePrivacy, value: 'public' | 'private' | 'friends') => {
    setSettings(prev => ({
      ...prev,
      profilePrivacy: {
        ...prev.profilePrivacy,
        [key]: value
      }
    }));
  };

  const getPrivacyIcon = (setting: 'public' | 'private' | 'friends') => {
    switch (setting) {
      case 'public': return <Globe size={16} className="text-green-600" />;
      case 'private': return <Lock size={16} className="text-gray-600" />;
      case 'friends': return <Users size={16} className="text-blue-600" />;
      default: return <Globe size={16} className="text-gray-600" />;
    }
  };

  const getPrivacyLabel = (setting: 'public' | 'private' | 'friends') => {
    switch (setting) {
      case 'public': return 'Public';
      case 'private': return 'Private';
      case 'friends': return 'Friends';
      default: return 'Public';
    }
  };

  const getPrivacyColor = (setting: 'public' | 'private' | 'friends') => {
    switch (setting) {
      case 'public': return 'bg-green-100 text-green-700';
      case 'private': return 'bg-gray-100 text-gray-700';
      case 'friends': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const userConnections = 1200; // In real app, derive from user profile

  const settingSections = [
    {
      id: 'account',
      title: 'Account',
      icon: User,
      items: [
        { id: 'edit-profile', label: 'Edit Profile', action: () => setActiveSection('account'), },
        { id: 'photos', label: 'Manage Photos', action: () => setActiveSection('account') },
        { id: 'verification', label: 'Get Verified', action: () => navigate('/verify') },
        { id: 'verification-expanded', label: 'Expanded Verification', action: () => navigate('/verify/expanded') },
        { id: 'couple', label: 'Create Couple Profile', action: () => navigate('/couple') },
        { id: 'date-builder', label: 'Date Builder', action: () => navigate('/date-builder') },
        { id: 'calendar', label: 'Shared Calendar', action: () => navigate('/calendar') },
        { id: 'safety', label: 'Safety Toolkit', action: () => navigate('/safety') },
        { id: 'prompts', label: 'Prompts & QOTD', action: () => navigate('/prompts') },
        { id: 'quiz', label: 'Compatibility Quiz', action: () => navigate('/onboarding/quiz') }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      items: [
        { 
          id: 'sparks', 
          label: 'New Sparks', 
          toggle: true, 
          value: settings.notifications.sparks,
          action: () => toggleSetting('notifications', 'sparks')
        },
        { 
          id: 'messages', 
          label: 'New Messages', 
          toggle: true, 
          value: settings.notifications.messages,
          action: () => toggleSetting('notifications', 'messages')
        },
        { 
          id: 'connections', 
          label: 'New Connections', 
          toggle: true, 
          value: settings.notifications.connections,
          action: () => toggleSetting('notifications', 'connections')
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Safety',
      icon: Shield,
      items: [
        { 
          id: 'show-age', 
          label: 'Show Age on Profile', 
          toggle: true, 
          value: settings.privacy.showAge,
          action: () => toggleSetting('privacy', 'showAge')
        },
        { 
          id: 'show-location', 
          label: 'Show Location', 
          toggle: true, 
          value: settings.privacy.showLocation,
          action: () => toggleSetting('privacy', 'showLocation')
        },
        { 
          id: 'show-distance', 
          label: 'Show Distance', 
          toggle: true, 
          value: settings.privacy.showDistance,
          action: () => toggleSetting('privacy', 'showDistance')
        },
        { 
          id: 'incognito', 
          label: 'Incognito Mode', 
          toggle: true, 
          value: settings.privacy.incognito,
          action: () => toggleSetting('privacy', 'incognito')
        },
        { id: 'message-mode', label: 'Message Controls', subtitle: settings.privacy.messageMode === 'everyone' ? 'Everyone can message you' : settings.privacy.messageMode === 'connections' ? 'Only connections can message' : 'No one can message', action: () => setActiveSection('privacy') },
        { id: 'blocked-users', label: 'Blocked Users', action: () => setActiveSection('privacy') },
        { id: 'report-safety', label: 'Report & Safety', action: () => setActiveSection('privacy') }
      ]
    },
    {
      id: 'discovery',
      title: 'Discovery Preferences',
      icon: Heart,
      items: [
        { id: 'age-range', label: 'Age Range', subtitle: `${settings.discovery.ageRange[0]} - ${settings.discovery.ageRange[1]}`, action: () => setActiveSection('discovery') },
        { id: 'distance', label: 'Maximum Distance', subtitle: `${settings.discovery.maxDistance} km`, action: () => setActiveSection('discovery') },
        { id: 'show-me', label: 'Show Me', subtitle: 'Everyone', action: () => setActiveSection('discovery') }
      ]
    },
    {
      id: 'profilePrivacy',
      title: 'Profile Privacy',
      icon: Eye,
      items: [
        { 
          id: 'reposts', 
          label: 'Reposts Visibility', 
          subtitle: `${getPrivacyLabel(settings.profilePrivacy.reposts)} - ${settings.profilePrivacy.reposts === 'public' ? 'Everyone can see' : settings.profilePrivacy.reposts === 'friends' ? 'Only connections can see' : 'Only you can see'}`, 
          action: () => setActiveSection('profilePrivacy'),
          privacy: settings.profilePrivacy.reposts
        },
        { 
          id: 'savedBoards', 
          label: 'Saved Boards Visibility', 
          subtitle: `${getPrivacyLabel(settings.profilePrivacy.savedBoards)} - ${settings.profilePrivacy.savedBoards === 'public' ? 'Everyone can see' : settings.profilePrivacy.savedBoards === 'friends' ? 'Only connections can see' : 'Only you can see'}`, 
          action: () => setActiveSection('profilePrivacy'),
          privacy: settings.profilePrivacy.savedBoards
        },
        { 
          id: 'collections', 
          label: 'Collections Visibility', 
          subtitle: `${getPrivacyLabel(settings.profilePrivacy.collections)} - ${settings.profilePrivacy.collections === 'public' ? 'Everyone can see' : settings.profilePrivacy.collections === 'friends' ? 'Only connections can see' : 'Only you can see'}`, 
          action: () => setActiveSection('profilePrivacy'),
          privacy: settings.profilePrivacy.collections
        },
        { 
          id: 'profileStats', 
          label: 'Profile Stats Visibility', 
          subtitle: `${getPrivacyLabel(settings.profilePrivacy.profileStats)} - ${settings.profilePrivacy.profileStats === 'public' ? 'Everyone can see' : settings.profilePrivacy.profileStats === 'friends' ? 'Only connections can see' : 'Only you can see'}`, 
          action: () => setActiveSection('profilePrivacy'),
          privacy: settings.profilePrivacy.profileStats
        }
      ]
    }
  ];

  if (activeSection) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => setActiveSection(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">
            {settingSections.find(s => s.id === activeSection)?.title}
          </h1>
        </div>
        {/* Section-specific content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {(activeSection === 'notifications') && (
            <div>
              <h2 className="font-semibold mb-2">Notification Preferences</h2>
              <p className="text-sm text-gray-600">Choose what you want to be notified about.</p>
            </div>
          )}
          {(activeSection === 'account') && (
            <div className="space-y-3">
              <h2 className="font-semibold">Account</h2>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>Edit your profile details</li>
                <li>Manage your photos</li>
                <li>Apply for verification</li>
              </ul>
            </div>
          )}
          {(activeSection === 'privacy') && (
            <div>
              <h2 className="font-semibold mb-2">Privacy & Safety</h2>
              <p className="text-sm text-gray-600">Control who sees your information and how you interact with others.</p>
            </div>
          )}
          {(activeSection === 'discovery') && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                <div className="flex items-center space-x-2">
                  <input type="number" className="w-24 px-3 py-2 border border-gray-300 rounded-lg" value={settings.discovery.ageRange[0]} onChange={() => {}} />
                  <span className="text-gray-500">to</span>
                  <input type="number" className="w-24 px-3 py-2 border border-gray-300 rounded-lg" value={settings.discovery.ageRange[1]} onChange={() => {}} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Distance</label>
                <input type="range" min={1} max={200} value={settings.discovery.maxDistance} onChange={() => {}} className="w-full" />
              </div>
            </div>
          )}
          {(activeSection === 'profilePrivacy') && (
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold mb-2">Profile Privacy Settings</h2>
                <p className="text-sm text-gray-600">Control who can see different parts of your profile.</p>
              </div>
              
              {/* Reposts Privacy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={18} className="text-coral" />
                    <span className="font-medium">Reposts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPrivacyIcon(settings.profilePrivacy.reposts)}
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrivacyColor(settings.profilePrivacy.reposts)}`}>
                      {getPrivacyLabel(settings.profilePrivacy.reposts)}
                    </span>
                  </div>
                </div>
                <select
                  value={settings.profilePrivacy.reposts}
                  onChange={(e) => updateProfilePrivacy('reposts', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="public">Public - Everyone can see your reposts</option>
                  <option value="friends">Friends - Only your connections can see</option>
                  <option value="private">Private - Only you can see</option>
                </select>
              </div>

              {/* Saved Boards Privacy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bookmark size={18} className="text-blue-500" />
                    <span className="font-medium">Saved Boards</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPrivacyIcon(settings.profilePrivacy.savedBoards)}
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrivacyColor(settings.profilePrivacy.savedBoards)}`}>
                      {getPrivacyLabel(settings.profilePrivacy.savedBoards)}
                    </span>
                  </div>
                </div>
                <select
                  value={settings.profilePrivacy.savedBoards}
                  onChange={(e) => updateProfilePrivacy('savedBoards', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="public">Public - Everyone can see your boards</option>
                  <option value="friends">Friends - Only your connections can see</option>
                  <option value="private">Private - Only you can see</option>
                </select>
              </div>

              {/* Collections Privacy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart size={18} className="text-pink-500" />
                    <span className="font-medium">Collections</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPrivacyIcon(settings.profilePrivacy.collections)}
                    <div className={`px-2 py-1 text-xs rounded-full ${getPrivacyColor(settings.profilePrivacy.collections)}`}>
                      {getPrivacyLabel(settings.profilePrivacy.collections)}
                    </div>
                  </div>
                </div>
                <select
                  value={settings.profilePrivacy.collections}
                  onChange={(e) => updateProfilePrivacy('collections', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="public">Public - Everyone can see your collections</option>
                  <option value="friends">Friends - Only your connections can see</option>
                  <option value="private">Private - Only you can see</option>
                </select>
              </div>

              {/* Profile Stats Privacy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users size={18} className="text-green-500" />
                    <span className="font-medium">Profile Stats</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPrivacyIcon(settings.profilePrivacy.profileStats)}
                    <span className={`px-2 py-1 text-xs rounded-full ${getPrivacyColor(settings.profilePrivacy.profileStats)}`}>
                      {getPrivacyLabel(settings.profilePrivacy.profileStats)}
                    </span>
                  </div>
                </div>
                <select
                  value={settings.profilePrivacy.profileStats}
                  onChange={(e) => updateProfilePrivacy('profileStats', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="public">Public - Everyone can see your stats</option>
                  <option value="friends">Friends - Only your connections can see</option>
                  <option value="private">Private - Only you can see</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> These settings control what others can see when viewing your profile. 
                  Changes take effect immediately and are also available in your Profile page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Language & Timezone */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-coral/10 rounded-full">
                <Globe size={20} className="text-coral" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t('settings.language', 'Language')}</h2>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700 min-w-[120px]">{t('settings.language', 'Language')}</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="en">{t('language.en', 'English')}</option>
                <option value="ar">{t('language.ar', 'Arabic (RTL)')}</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-700 min-w-[120px]">{t('settings.timezone', 'Time zone')}</label>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                placeholder="e.g., America/New_York"
                aria-label="Time zone"
              />
            </div>
          </div>
        </div>
        <button onClick={()=>{ window.location.assign('/premium'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Crown className="text-yellow-500" size={20} />
            </div>
            <div>
              <p className="font-medium">Premium</p>
              <p className="text-sm text-gray-500">Advanced filters, incognito, boosts</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/boosts'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
              <Sparkles className="text-coral" size={20} />
            </div>
            <div>
              <p className="font-medium">Boosts & Super-Sparks</p>
              <p className="text-sm text-gray-500">Get seen more, send premium sparks</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/gifts'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
              <Heart className="text-pink-500" size={20} />
            </div>
            <div>
              <p className="font-medium">Virtual Gifts</p>
              <p className="text-sm text-gray-500">Stickers and animated sparkles</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/groups'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="font-medium">Groups</p>
              <p className="text-sm text-gray-500">Communities with shared interests</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/events'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CalendarIcon className="text-green-600" size={20} />
            </div>
            <div>
              <p className="font-medium">Events</p>
              <p className="text-sm text-gray-500">Create events and manage RSVPs</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/achievements'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Sparkles className="text-orange-500" size={20} />
            </div>
            <div>
              <p className="font-medium">Achievements</p>
              <p className="text-sm text-gray-500">Streaks and weekly challenges</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/digests'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Bell size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Digests</p>
              <p className="text-sm text-gray-500">Daily/weekly summaries and reminders</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        <button onClick={()=>{ window.location.assign('/notifications/prefs'); }} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Bell size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-medium">Push & Email</p>
              <p className="text-sm text-gray-500">Quiet hours and channels</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        {settingSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-coral/10 rounded-full">
                    <Icon size={20} className="text-coral" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const isToggle = (item as any).toggle === true;
                      if (!isToggle) {
                        setActiveSection(section.id);
                        (item as any).action?.();
                      }
                    }}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-900 truncate">{item.label}</span>
                          {((item as any).toggle === true) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                (item as any).action();
                              }}
                              className={`relative inline-flex items-center shrink-0 transition-colors 
                                h-7 w-16 rounded-md ${((item as any).value ? 'bg-coral' : 'bg-gray-300')}`}
                              aria-pressed={(item as any).value}
                              aria-label={`${item.label} toggle`}
                            >
                              <span
                                className={`absolute bg-white transition-all 
                                  top-1 h-5 w-7 rounded-md 
                                  ${((item as any).value ? 'right-1 left-auto' : 'left-1 right-auto')}`}
                              />
                            </button>
                          ) : (item as any).privacy ? (
                            <div className="flex items-center space-x-2">
                              {getPrivacyIcon((item as any).privacy)}
                              <span className={`px-2 py-1 text-xs rounded-full ${getPrivacyColor((item as any).privacy)}`}>
                                {getPrivacyLabel((item as any).privacy)}
                              </span>
                            </div>
                          ) : (
                            <ChevronRight size={20} className="text-gray-400 shrink-0" />
                          )}
                        </div>
                        {('subtitle' in (item as any)) && (
                          <p className="text-sm text-gray-500 mt-1">{(item as any).subtitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Account Actions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <MessageCircle size={20} className="text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">Help & Support</span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </button>
            
            <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Eye size={20} className="text-yellow-600" />
                  </div>
                  <span className="font-medium text-gray-900">Privacy Policy</span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </button>
            
            <button className="w-full p-4 text-left hover:bg-red-50 transition-colors text-red-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <span className="font-medium">Delete Account</span>
                </div>
                <ChevronRight size={20} className="text-red-400" />
              </div>
            </button>
            
            <button className="w-full p-4 text-left hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <LogOut size={20} className="text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">Sign Out</span>
                </div>
                <button
                  onClick={() => { 
                    localStorage.removeItem('spark_session'); 
                    localStorage.removeItem('access_token'); 
                    window.location.reload(); 
                  }}
                  className="px-3 py-1 bg-coral text-white rounded-full text-xs font-medium hover:bg-coral/90"
                >
                  Logout
                </button>
              </div>
            </button>
          </div>
        </div>

        {/* Business Page (gated) */}
        {userConnections >= 1000 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Create a Business Page</h3>
            <p className="text-sm text-gray-600 mb-3">You have {userConnections} connections. You can create a page to showcase your brand or community.</p>
            <button className="px-4 py-2 bg-coral text-white rounded-full font-medium hover:bg-coral/90 transition-colors">Create Page</button>
          </div>
        )}

        {/* App Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <h3 className="font-semibold text-coral mb-2">Spark</h3>
          <p className="text-sm text-gray-600 mb-1">Version 1.0.0</p>
          <p className="text-xs text-gray-500">See the Story, Make the Connection</p>
        </div>
      </div>
    </div>
  );
};