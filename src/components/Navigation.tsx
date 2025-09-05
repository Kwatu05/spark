import React from 'react';
import { Home, Search, Plus, Play, User } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'feed', label: 'The Mix', icon: Home },
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'post', label: 'Post', icon: Plus },
    { id: 'moments', label: 'Moments', icon: Play },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center py-2 px-4 transition-colors ${
                  isActive 
                    ? 'text-coral' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon 
                  size={24} 
                  className={`mb-1 ${isActive ? 'fill-current' : ''}`} 
                />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};