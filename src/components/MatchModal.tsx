import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { User } from '../App';
import { SparkAnimation } from './SparkAnimation';

interface MatchModalProps {
  user: User;
  onClose: () => void;
  onStartChat: (user: User) => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({ user, onClose, onStartChat }) => {
  const [showAnimation, setShowAnimation] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <SparkAnimation 
        isVisible={showAnimation} 
        onComplete={() => setShowAnimation(false)} 
      />
      
      {showContent && (
        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-coral to-warm-pink p-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">It's a Match!</h1>
            <p className="text-white/90">You and {user.name} sparked each other</p>
          </div>

          {/* User Info */}
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-coral/20"
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{user.name}, {user.age}</h2>
                <p className="text-gray-600">{user.location}</p>
                <p className="text-sm text-gray-500">{user.profession}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-coral/10 to-warm-pink/10 p-4 rounded-xl mb-6">
              <p className="text-sm text-gray-700 text-center">
                <strong>🎉 Congratulations!</strong> You can now send messages to each other. 
                Start with something about what caught your attention in their posts!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => onStartChat(user)}
                className="w-full py-4 bg-gradient-to-r from-coral to-warm-pink text-white rounded-xl font-semibold transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <MessageCircle size={20} />
                <span>Start Chatting</span>
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Keep Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};