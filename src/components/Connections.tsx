import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, X, Check, Clock, Sparkles } from 'lucide-react';
import { User, Connection } from '../App';
import { api } from '../lib/api';

interface ConnectionsProps {
  onOpenChat: (user: User) => void;
}

export const Connections: React.FC<ConnectionsProps> = ({ onOpenChat }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'connected' | 'sparked'>('pending');

  const mockConnections: Connection[] = [
    {
      id: '1',
      user: mockUsers[1],
      status: 'pending',
      sparkContext: 'Liked your hiking post'
    },
    {
      id: '2',
      user: mockUsers[2],
      status: 'connected',
      mutualSpark: true,
      sparkContext: 'Both liked "Jazz bar discovery"'
    },
    {
      id: '3',
      user: mockUsers[3],
      status: 'sparked',
      sparkContext: 'You liked their rock climbing video'
    },
    {
      id: '4',
      user: mockUsers[4],
      status: 'connected',
      mutualSpark: true,
      sparkContext: 'Both liked "Morning yoga session"'
    },
    {
      id: '5',
      user: mockUsers[5],
      status: 'pending',
      sparkContext: 'Liked your architecture post'
    }
  ];

  const [connections, setConnections] = useState<Connection[]>(mockConnections);

  useEffect(() => {
    api.get<{ ok: boolean; connections: any[] }>(`/connections`).then((data) => {
      if (data?.ok && Array.isArray(data.connections)) {
        const mapped: Connection[] = data.connections.map((c: any, idx: number) => ({
          id: c.id,
          user: {
            id: c.user?.id || `u${idx+1}`,
            name: c.user?.name || 'User',
            age: 0,
            bio: '',
            location: '',
            profession: '',
            avatar: c.user?.avatar || 'https://placehold.co/64',
            connectionPreference: '',
            interests: [],
            posts: [],
          },
          status: c.status,
          mutualSpark: c.mutualSpark,
          sparkContext: c.sparkContext,
        }));
        setConnections(mapped);
      }
    }).catch(() => {});
  }, []);

  const filteredConnections = connections.filter(conn => conn.status === activeTab);

  const handleAcceptSpark = (connectionId: string) => {
    setConnections(connections.map(conn =>
      conn.id === connectionId
        ? { ...conn, status: 'connected', mutualSpark: true }
        : conn
    ));
    api.post(`/connections/${connectionId}/accept`).catch(() => {
      // no-op for demo
    });
  };

  const handleDeclineSpark = (connectionId: string) => {
    setConnections(connections.filter(conn => conn.id !== connectionId));
    api.post(`/connections/${connectionId}/decline`).catch(() => {
      // no-op for demo
    });
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: connections.filter(c => c.status === 'pending').length },
    { id: 'connected', label: 'Connected', count: connections.filter(c => c.status === 'connected').length },
    { id: 'sparked', label: 'Sparked', count: connections.filter(c => c.status === 'sparked').length }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connections</h1>
        <p className="text-gray-600">Manage your sparks and connections</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-coral text-coral bg-coral/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  activeTab === tab.id
                    ? 'bg-coral text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Connections List */}
      <div className="space-y-4">
        {filteredConnections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              {activeTab === 'pending' && <Clock size={32} className="text-gray-400" />}
              {activeTab === 'connected' && <Heart size={32} className="text-gray-400" />}
              {activeTab === 'sparked' && <Sparkles size={32} className="text-gray-400" />}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'pending' && 'No pending sparks'}
              {activeTab === 'connected' && 'No connections yet'}
              {activeTab === 'sparked' && 'No sparks sent'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'pending' && 'When someone sparks your content, they\'ll appear here'}
              {activeTab === 'connected' && 'Start sparking content to make connections!'}
              {activeTab === 'sparked' && 'Spark someone\'s content to start a connection'}
            </p>
          </div>
        ) : (
          filteredConnections.map((connection) => (
            <div key={connection.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <img
                  src={connection.user.avatar}
                  alt={connection.user.name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-coral/20"
                />
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-lg">{connection.user.name}</h3>
                    {connection.user.isVerified && (
                      <div className="w-4 h-4 bg-coral rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{connection.user.location} • {connection.user.profession}</p>
                  
                  {connection.sparkContext && (
                    <div className="flex items-center space-x-2 mb-3">
                      <Sparkles size={14} className="text-coral" />
                      <span className="text-sm text-coral font-medium">{connection.sparkContext}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {connection.user.interests.slice(0, 3).map((interest, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  {connection.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAcceptSpark(connection.id)}
                        className="px-4 py-2 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors flex items-center space-x-1"
                      >
                        <Check size={16} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleDeclineSpark(connection.id)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 transition-colors flex items-center space-x-1"
                      >
                        <X size={16} />
                        <span>Decline</span>
                      </button>
                    </>
                  )}
                  
                  {connection.status === 'connected' && (
                    <button
                      onClick={() => onOpenChat(connection.user)}
                      className="px-4 py-2 bg-gradient-to-r from-coral to-warm-pink text-white rounded-full font-semibold transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-1"
                    >
                      <MessageCircle size={16} />
                      <span>Chat</span>
                    </button>
                  )}
                  
                  {connection.status === 'sparked' && (
                    <div className="px-4 py-2 bg-sunset/10 text-sunset rounded-full font-semibold text-center">
                      <div className="flex items-center space-x-1">
                        <Heart size={16} />
                        <span>Sparked</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};