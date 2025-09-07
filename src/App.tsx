import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import MobileNavigation from './components/MobileNavigation';
import PWAInstall from './components/PWAInstall';
import { Feed } from './components/Feed';
import { Discover } from './components/Discover';
import { CreatePost } from './components/CreatePost';
const Moments = lazy(() => import('./components/Moments').then(m => ({ default: m.Moments })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
import { AuthModal } from './components/AuthModal';
import { ChatModal } from './components/ChatModal';
import { Notifications } from './components/Notifications';
import { Settings } from './components/Settings';
const EditProfile = lazy(() => import('./components/EditProfile').then(m => ({ default: m.EditProfile })));
const DateIdeas = lazy(() => import('./components/DateIdeas').then(m => ({ default: m.DateIdeas })));
import { PublicProfile } from './components/PublicProfile';
import { ProfileSavedBoards } from './components/ProfileSavedBoards';
import { ProfileReposts } from './components/ProfileReposts';
const CoupleProfileMerge = lazy(() => import('./components/CoupleProfileMerge').then(m => ({ default: m.CoupleProfileMerge })));
const DateBuilder = lazy(() => import('./components/DateBuilder').then(m => ({ default: m.DateBuilder })));
const VerificationFlow = lazy(() => import('./components/VerificationFlow').then(m => ({ default: m.VerificationFlow })));
const VerificationExpanded = lazy(() => import('./components/VerificationExpanded').then(m => ({ default: m.VerificationExpanded })));
import { AuthVerification } from './components/AuthVerification';
import { AuthDebug } from './components/AuthDebug';
const CoupleBoards = lazy(() => import('./components/CoupleBoards').then(m => ({ default: m.CoupleBoards })));
const CoupleMilestones = lazy(() => import('./components/CoupleMilestones').then(m => ({ default: m.CoupleMilestones })));
import { CompatibilityQuiz } from './components/CompatibilityQuiz';
import { PromptsQOTD } from './components/PromptsQOTD';
import { AVCall } from './components/AVCall';
const Calendar = lazy(() => import('./components/Calendar').then(m => ({ default: m.Calendar })));
const SafetyToolkit = lazy(() => import('./components/SafetyToolkit').then(m => ({ default: m.SafetyToolkit })));
import { OnboardingFlow } from './components/OnboardingFlow';
const PremiumPaywall = lazy(() => import('./components/PremiumPaywall').then(m => ({ default: m.PremiumPaywall })));
const Boosts = lazy(() => import('./components/Boosts').then(m => ({ default: m.Boosts })));
const VirtualGifts = lazy(() => import('./components/VirtualGifts').then(m => ({ default: m.VirtualGifts })));
const Groups = lazy(() => import('./components/Groups').then(m => ({ default: m.Groups })));
const Events = lazy(() => import('./components/Events').then(m => ({ default: m.Events })));
const Gamification = lazy(() => import('./components/Gamification').then(m => ({ default: m.Gamification })));
const Digests = lazy(() => import('./components/Digests').then(m => ({ default: m.Digests })));
const NotificationPrefs = lazy(() => import('./components/NotificationPrefs').then(m => ({ default: m.NotificationPrefs })));
const AdminConsole = lazy(() => import('./components/AdminConsole').then(m => ({ default: m.AdminConsole })));
import { Bell, MessageCircle } from 'lucide-react';
import { api } from './lib/api';
import { initializeExperiments, trackEvent } from './lib/experiments';
import './styles/mobile.css';
import './styles/mobile-nav.css';
import './styles/pwa-install.css';

export type User = {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  profession: string;
  avatar: string;
  connectionPreference: string;
  interests: string[];
  posts: Post[];
  isVerified?: boolean;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
  verificationStatus?: 'pending' | 'approved' | 'rejected' | 'none';
};

export type Post = {
  id: string;
  userId: string;
  user: User;
  type: 'photo' | 'video' | 'carousel';
  content: string[];
  caption: string;
  activityTags: string[];
  likes: number;
  isLiked: boolean;
  timestamp: string;
  location?: string;
};

export type Connection = {
  id: string;
  user: User;
  status: 'pending' | 'connected' | 'sparked';
  mutualSpark?: boolean;
  sparkContext?: string;
};

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedChat, setSelectedChat] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('spark_session') === '1';
  });
  const [currentUserRole, setCurrentUserRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');

  const openChat = (user: User) => {
    setSelectedChat(user);
    navigate('/chat');
  };

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.get<{ ok: boolean; authenticated: boolean; user?: { role: 'USER' | 'MODERATOR' | 'ADMIN' } }>(`/auth/session`).then((d) => {
      if (d?.ok) {
        setIsLoggedIn(d.authenticated);
        if (d.authenticated && d.user) {
          setCurrentUserRole(d.user.role);
          initializeExperiments();
          trackEvent('app_loaded', { authenticated: true });
        }
      }
    }).catch((error) => {
      console.log('Session check failed, using fallback authentication:', error);
      // For development, allow access even if session check fails
      const hasSession = localStorage.getItem('spark_session') === '1';
      if (hasSession) {
        setIsLoggedIn(true);
        setCurrentUserRole('USER');
      }
      initializeExperiments();
      trackEvent('app_loaded', { authenticated: hasSession });
    });
  }, []);

  // PWA Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Handle PWA install prompt
    let deferredPrompt: any;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTabChange = (tab: string) => {
    // Close overlays so tab content is visible
    setSelectedChat(null);
    setActiveTab(tab);
    navigate(`/${tab}`);
  };


  if (!isLoggedIn) {
    return <AuthModal />;
  }

  // Admin dashboard gets its own layout without frontend UI elements
  if (location.pathname === '/admin') {
    return <AdminConsole />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto bg-white min-h-screen">
        {/* Skip to content for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded"
        >
          Skip to main content
        </a>
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-coral to-sunset bg-clip-text text-transparent">
                Spark
              </h1>
              <span className="text-xs text-gray-500 font-medium">See the Story, Make the Connection</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  if (location.pathname === '/notifications') {
                    navigate(`/${activeTab}`);
                  } else {
                    navigate('/notifications');
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
              >
                <Bell size={24} />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-coral text-white text-xs rounded-full flex items-center justify-center font-medium">
                  3
                </div>
              </button>
              <button 
                onClick={() => navigate('/chat')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MessageCircle size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* Verification Status Banner */}
        {isLoggedIn && currentUserRole !== 'ADMIN' && currentUserRole !== 'MODERATOR' && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-yellow-800">Verification pending admin approval</span>
              </div>
              <button 
                onClick={() => navigate('/verify')}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                Check Status
              </button>
            </div>
          </div>
        )}

        {/* Main Content routed */}
        <main id="main-content" role="main" tabIndex={-1} className="pb-20">
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to={`/${activeTab}`} replace />} />
            <Route path="/feed" element={
              currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR' ? 
                <Navigate to="/admin" replace /> : 
                <Feed onOpenChat={openChat} />
            } />
            <Route path="/discover" element={<Discover onOpenChat={openChat} />} />
            <Route path="/post" element={<CreatePost onBack={() => handleTabChange('feed')} />} />
            <Route path="/moments" element={<Moments onOpenChat={openChat} />} />
            <Route path="/profile" element={<Profile 
              onOpenChat={openChat}
              onEditProfile={() => navigate('/edit-profile')}
              onSettings={() => navigate('/settings')}
              onDateIdeas={() => navigate('/date-ideas')}
            />} />
            <Route path="/profile/saves" element={<ProfileSavedBoards />} />
            <Route path="/profile/reposts" element={<ProfileReposts />} />
            <Route path="/notifications" element={<Notifications onOpenChat={openChat} />} />
            <Route path="/settings" element={<Settings onBack={() => navigate(-1)} />} />
            <Route path="/edit-profile" element={<EditProfile onBack={() => navigate(-1)} />} />
            <Route path="/date-ideas" element={<DateIdeas />} />
            <Route path="/u/:id" element={<PublicProfile />} />
            <Route path="/chat" element={<ChatModal user={selectedChat} onClose={() => { navigate(-1); setSelectedChat(null); }} />} />
            <Route path="/couple" element={<CoupleProfileMerge />} />
            <Route path="/date-builder" element={<DateBuilder />} />
            <Route path="/verify" element={<VerificationFlow />} />
            <Route path="/verify/expanded" element={<VerificationExpanded />} />
            <Route path="/auth-verify" element={<AuthVerification />} />
                         <Route path="/couple/boards" element={<CoupleBoards />} />
             <Route path="/couple/milestones" element={<CoupleMilestones />} />
            <Route path="/onboarding/quiz" element={<CompatibilityQuiz />} />
            <Route path="/prompts" element={<PromptsQOTD />} />
            <Route path="/call" element={<AVCall />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/safety" element={<SafetyToolkit />} />
            <Route path="/premium" element={<PremiumPaywall currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/boosts" element={<Boosts currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/gifts" element={<VirtualGifts currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/groups" element={<Groups currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/events" element={<Events currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/achievements" element={<Gamification currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/digests" element={<Digests currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/notifications/prefs" element={<NotificationPrefs currentUser={selectedChat} onBack={() => navigate(-1)} />} />
            <Route path="/onboarding" element={<OnboardingFlow onComplete={() => navigate('/feed')} />} />
          </Routes>
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        {/* Mobile Navigation */}
        <MobileNavigation />

        {/* PWA Install Prompt */}
        <PWAInstall />

        {/* Auth Debug Component (Development Only) */}
        {import.meta.env.DEV && <AuthDebug />}

        {/* Routed chat modal handled by /chat */}
      </div>
    </div>
  );
}

export default App;