import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, Sparkles, Clock, Check, X } from 'lucide-react';
import { User } from '../App';
import { mockUsers } from '../data/mockData';
import { api } from '../lib/api';

interface Notification {
  id: string;
  type: 'spark' | 'message' | 'connection' | 'post_like';
  user: User;
  content: string;
  timestamp: string;
  isRead: boolean;
  postImage?: string;
}

interface NotificationsProps {
  onOpenChat: (user: User) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ onOpenChat }) => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'spark',
      user: mockUsers[1],
      content: 'sent you a Spark on your hiking post',
      timestamp: '5 minutes ago',
      isRead: false,
      postImage: 'https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    {
      id: '2',
      type: 'connection',
      user: mockUsers[2],
      content: 'You\'re now connected! Start a conversation',
      timestamp: '1 hour ago',
      isRead: false
    },
    {
      id: '3',
      type: 'message',
      user: mockUsers[3],
      content: 'sent you a message',
      timestamp: '2 hours ago',
      isRead: true
    },
    {
      id: '4',
      type: 'post_like',
      user: mockUsers[4],
      content: 'liked your yoga session post',
      timestamp: '3 hours ago',
      isRead: true,
      postImage: 'https://images.pexels.com/photos/317155/pexels-photo-317155.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    {
      id: '5',
      type: 'spark',
      user: mockUsers[5],
      content: 'sent you a Spark on your architecture post',
      timestamp: '1 day ago',
      isRead: true,
      postImage: 'https://images.pexels.com/photos/1797121/pexels-photo-1797121.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    }
  ];

  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  useEffect(() => {
    api.get<{ ok: boolean; notifications: { id: string; type: 'spark' | 'message' | 'follow'; text: string; read: boolean }[] }>(`/notifications`)
      .then((data) => {
        if (data?.ok && Array.isArray(data.notifications)) {
          // Map backend notifications to current UI shape using mock users as placeholders
          const mapped: Notification[] = data.notifications.map((n, idx) => ({
            id: n.id,
            type: n.type === 'follow' ? 'connection' : (n.type as any),
            user: mockUsers[(idx % (mockUsers.length - 1)) + 1],
            content: n.text,
            timestamp: 'just now',
            isRead: n.read,
          }));
          setNotifications(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notif =>
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    ));
    api.post(`/notifications/${notificationId}/read`).catch(() => {
      setNotifications(prev => prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: false } : notif
      ));
    });
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
    api.post(`/notifications/read-all`).catch(() => {
      // no-op rollback to unread isn't necessary visually, but we could re-fetch
    });
  };

  const handleAcceptSpark = (notificationId: string) => {
    // In a real app, accepting would create a connection and maybe open chat
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };

  const handleDeclineSpark = (notificationId: string) => {
    // In a real app, declining would dismiss or archive the spark
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'spark':
        return <Sparkles size={20} className="text-coral" />;
      case 'message':
        return <MessageCircle size={20} className="text-blue-500" />;
      case 'connection':
        return <UserPlus size={20} className="text-green-500" />;
      case 'post_like':
        return <Heart size={20} className="text-pink-500" />;
      default:
        return <Heart size={20} className="text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-coral hover:bg-coral/10 rounded-full font-medium transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => markAsRead(notification.id)}
            className={`bg-white rounded-xl border border-gray-200 p-4 cursor-pointer transition-all duration-200 ${
              !notification.isRead ? 'ring-2 ring-coral/20 bg-coral/5' : ''
            }`}
          >
            <div className="flex items-center space-x-4">
              {/* Notification Icon */}
              <div className={`p-2 rounded-full ${
                !notification.isRead ? 'bg-coral/10' : 'bg-gray-100'
              }`}>
                {getNotificationIcon(notification.type)}
              </div>

              {/* User Avatar */}
              <img
                src={notification.user.avatar}
                alt={notification.user.name}
                className="w-12 h-12 rounded-full object-cover"
              />

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-900">{notification.user.name}</span>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-coral rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-700">{notification.content}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{notification.timestamp}</span>
                </div>
              </div>

              {/* Post Thumbnail */}
              {notification.postImage && (
                <img
                  src={notification.postImage}
                  alt="Post"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2">
                {notification.type === 'spark' && notification.user && (
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptSpark(notification.id);
                      }}
                      className="p-2 bg-coral text-white rounded-full hover:bg-coral/90 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeclineSpark(notification.id);
                      }}
                      className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                
                {(notification.type === 'connection' || notification.type === 'message') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChat(notification.user);
                    }}
                    className="px-3 py-1 bg-coral text-white rounded-full text-xs font-medium hover:bg-coral/90 transition-colors"
                  >
                    Chat
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Heart size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</h3>
          <p className="text-gray-600">When people interact with your content, you'll see it here</p>
        </div>
      )}
    </div>
  );
};