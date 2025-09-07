import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  exact?: boolean;
}

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('');

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      path: '/',
      exact: true
    },
    {
      id: 'search',
      label: 'Search',
      icon: '🔍',
      path: '/search'
    },
    {
      id: 'create',
      label: 'Create',
      icon: '✏️',
      path: '/create'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: '💬',
      path: '/messages',
      badge: 3 // This would come from props or context
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      path: '/profile'
    }
  ];

  useEffect(() => {
    // Determine active tab based on current location
    const currentPath = location.pathname;
    
    for (const item of navItems) {
      if (item.exact) {
        if (currentPath === item.path) {
          setActiveTab(item.id);
          return;
        }
      } else {
        if (currentPath.startsWith(item.path)) {
          setActiveTab(item.id);
          return;
        }
      }
    }
    
    setActiveTab('');
  }, [location.pathname]);

  const handleNavClick = (item: NavItem) => {
    setActiveTab(item.id);
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Track navigation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: 'NAVIGATION',
          data: {
            from: activeTab,
            to: item.id,
            path: item.path,
            timestamp: Date.now()
          }
        });
      });
    }
  };

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => handleNavClick(item)}
        >
          <div className="mobile-nav-icon">
            <span className="nav-icon-emoji">{item.icon}</span>
            {item.badge && item.badge > 0 && (
              <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </div>
          <span className="mobile-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default MobileNavigation;
