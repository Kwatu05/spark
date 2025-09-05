import React, { useState } from 'react';
import { ArrowLeft, Shield, UserX } from 'lucide-react';
import { User } from '../App';

interface BlockedUsersProps {
  onBack: () => void;
}

export const BlockedUsers: React.FC<BlockedUsersProps> = ({ onBack }) => {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([
    {
      id: 'blocked1',
      name: 'John Doe',
      age: 30,
      bio: '',
      location: 'London, UK',
      profession: 'Unknown',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      connectionPreference: '',
      interests: [],
      posts: []
    }
  ]);

  const unblockUser = (userId: string) => {
    setBlockedUsers(blockedUsers.filter(user => user.id !== userId));
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blocked Users</h1>
          <p className="text-gray-600">Manage users you've blocked</p>
        </div>
      </div>

      {blockedUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Shield size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No blocked users</h3>
          <p className="text-gray-600">Users you block will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blockedUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover opacity-60"
                />
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-600">{user.location}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <UserX size={14} className="text-red-500" />
                    <span className="text-sm text-red-600">Blocked</span>
                  </div>
                </div>

                <button
                  onClick={() => unblockUser(user.id)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-semibold hover:bg-gray-200 transition-colors"
                >
                  Unblock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <div className="flex items-center space-x-2 mb-2">
          <Shield size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Privacy & Safety</span>
        </div>
        <p className="text-sm text-blue-700">
          Blocked users cannot see your profile, send you messages, or interact with your content. 
          You won't see their content in your feed either.
        </p>
      </div>
    </div>
  );
};