import React, { useState } from 'react';
import { Heart, UserPlus, Sparkles, Clock } from 'lucide-react';
import { User } from '../App';
import { mockUsers } from '../data/mockData';

interface Activity {
  id: string;
  type: 'spark_received' | 'spark_sent' | 'connection_made' | 'post_liked' | 'profile_viewed';
  user: User;
  content: string;
  timestamp: string;
  postImage?: string;
  isNew: boolean;
}

interface ActivityFeedProps {
  onOpenChat: (user: User) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ onOpenChat }) => {
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'spark_received',
      user: mockUsers[1],
      content: 'sent you a Spark on your hiking post',
      timestamp: '5 minutes ago',
      postImage: 'https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      isNew: true
    },
    {
      id: '2',
      type: 'connection_made',
      user: mockUsers[2],
      content: 'You\'re now connected! 🎉',
      timestamp: '1 hour ago',
      isNew: true
    },
    {
      id: '3',
      type: 'profile_viewed',
      user: mockUsers[3],
      content: 'viewed your profile',
      timestamp: '2 hours ago',
      isNew: false
    },
    {
      id: '4',
      type: 'post_liked',
      user: mockUsers[4],
      content: 'liked your yoga session post',
      timestamp: '3 hours ago',
      postImage: 'https://images.pexels.com/photos/317155/pexels-photo-317155.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      isNew: false
    }
  ];

  const [activities] = useState<Activity[]>(mockActivities);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'spark_received':
      case 'spark_sent':
        return <Sparkles size={20} className="text-coral" />;
      case 'connection_made':
        return <UserPlus size={20} className="text-green-500" />;
      case 'post_liked':
        return <Heart size={20} className="text-pink-500" />;
      case 'profile_viewed':
        return <div className="w-5 h-5 bg-blue-500 rounded-full" />;
      default:
        return <Heart size={20} className="text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'spark_received':
      case 'spark_sent':
        return 'bg-coral/10';
      case 'connection_made':
        return 'bg-green-100';
      case 'post_liked':
        return 'bg-pink-100';
      case 'profile_viewed':
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity</h1>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`bg-white rounded-xl border border-gray-200 p-4 transition-all duration-200 ${
              activity.isNew ? 'ring-2 ring-coral/20' : ''
            }`}
          >
            <div className="flex items-center space-x-4">
              {/* Activity Icon */}
              <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>

              {/* User Avatar */}
              <img
                src={activity.user.avatar}
                alt={activity.user.name}
                className="w-12 h-12 rounded-full object-cover"
              />

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900">{activity.user.name}</span>
                  {activity.isNew && (
                    <div className="w-2 h-2 bg-coral rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-700">{activity.content}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{activity.timestamp}</span>
                </div>
              </div>

              {/* Post Thumbnail */}
              {activity.postImage && (
                <img
                  src={activity.postImage}
                  alt="Post"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}

              {/* Action Button */}
              {(activity.type === 'spark_received' || activity.type === 'connection_made') && (
                <button
                  onClick={() => onOpenChat(activity.user)}
                  className="px-4 py-2 bg-coral text-white rounded-full text-sm font-medium hover:bg-coral/90 transition-colors"
                >
                  {activity.type === 'connection_made' ? 'Chat' : 'Spark Back'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Sparkles size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No activity yet</h3>
          <p className="text-gray-600">When people interact with your content, you'll see it here</p>
        </div>
      )}
    </div>
  );
};