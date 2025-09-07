import React, { useState, useEffect } from 'react';
import { Settings, Edit3, MapPin, Briefcase, Heart, Grid, Bookmark, Sparkles, Camera, Users, Plus, Trash2, UserPlus, Crown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../App';
import { api } from '../lib/api';

interface ProfileProps {
  onOpenChat: (user: User) => void;
  onEditProfile: () => void;
  onSettings: () => void;
  onDateIdeas: () => void;
}

interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  profession: string;
  avatar: string;
  connectionPreference: string;
  interests: string[];
  isVerified: boolean;
  username: string;
  email: string;
}

export const Profile: React.FC<ProfileProps> = ({ onOpenChat: _onOpenChat, onEditProfile, onSettings, onDateIdeas }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'reposts' | 'groups'>('posts');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [privacy, setPrivacy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_privacy_settings') || '{}'); } catch { return {}; }
  });
  React.useEffect(() => {
    try { setPrivacy(JSON.parse(localStorage.getItem('app_privacy_settings') || '{}')); } catch {}
  }, []);

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);

  const fetchUserPosts = async () => {
    try {
      const response = await api.get<{ok: boolean; posts: any[]}>('/posts/user');
      if (response.ok) {
        setUserPosts(response.posts);
      }
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      setUserPosts([]);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ok: boolean; profile: UserProfile}>('/profile');
      if (response.ok) {
        setCurrentUser(response.profile);
        setAvatarUrl(response.profile.avatar || localStorage.getItem('profile_avatar') || '');
      } else {
        console.error('Profile fetch failed:', response);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  type Visibility = 'public' | 'friends' | 'private';
  const [savedFilter, setSavedFilter] = useState<'all' | Visibility>('all');
  const [repostsFilter, setRepostsFilter] = useState<'all' | Visibility>('all');



  // Mock data for reposts and collections
  const [userReposts] = useState(
    [
      { id: '1', postId: 'post1', originalPost: mockPosts[1], repostedAt: '2024-01-15T10:00:00Z', visibility: 'public' as Visibility },
      { id: '2', postId: 'post2', originalPost: mockPosts[2], repostedAt: '2024-01-14T15:30:00Z', visibility: 'friends' as Visibility },
      { id: '3', postId: 'post3', originalPost: mockPosts[3], repostedAt: '2024-01-13T09:15:00Z', visibility: 'private' as Visibility }
    ]
  );

  const [userCollections] = useState(
    [
      { id: '1', name: 'Adventure Spots', description: 'Places I want to explore', visibility: 'public' as Visibility, itemCount: 12 },
      { id: '2', name: 'Cozy Cafes', description: 'Perfect for coffee dates', visibility: 'private' as Visibility, itemCount: 8 },
      { id: '3', name: 'Travel Dreams', description: 'Destinations on my bucket list', visibility: 'friends' as Visibility, itemCount: 15 }
    ]
  );

  // Mock data for user groups (groups they created or manage)
  const [userGroups] = useState(
    [
      { 
        id: '1', 
        name: 'Tech Enthusiasts', 
        description: 'Discussing the latest in technology', 
        memberCount: 245, 
        isCreator: true, 
        isAdmin: true,
        visibility: 'public' as Visibility,
        createdAt: '2024-01-10T10:00:00Z'
      },
      { 
        id: '2', 
        name: 'Coffee Lovers', 
        description: 'Sharing coffee experiences and recipes', 
        memberCount: 89, 
        isCreator: true, 
        isAdmin: true,
        visibility: 'public' as Visibility,
        createdAt: '2024-01-05T15:30:00Z'
      },
      { 
        id: '3', 
        name: 'Book Club', 
        description: 'Monthly book discussions', 
        memberCount: 34, 
        isCreator: false, 
        isAdmin: true,
        visibility: 'private' as Visibility,
        createdAt: '2024-01-01T09:15:00Z'
      }
    ]
  );

  const stats = {
    posts: userPosts.length,
    sparks: 1247,
    connections: 89
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
            <span className="text-gray-600">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Please log in to view your profile.</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }



  const tabs = [
    { id: 'posts', label: 'Posts', icon: Grid },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'reposts', label: 'Reposts', icon: Sparkles },
    { id: 'groups', label: 'My Groups', icon: Users }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 relative">
        {/* Settings top-right */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <button onClick={() => navigate('/verify')} className="px-3 py-1.5 text-xs bg-coral text-white rounded-full">Verify</button>
          <button onClick={() => navigate('/couple')} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-full">Couple</button>
          <button onClick={() => navigate('/couple/boards')} className="px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full">Boards</button>
          <button onClick={() => navigate('/couple/milestones')} className="px-3 py-1.5 text-xs bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-full">Milestones</button>
          <button onClick={onSettings} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors" aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>

        <div className="flex items-start space-x-6">
          {/* Profile Image left aligned */}
          <div className="relative">
            <img
              src={avatarUrl}
              alt={currentUser.name}
              className="w-32 h-32 rounded-full object-cover ring-4 ring-coral/20"
            />
            <label className="absolute -bottom-2 -right-2 w-9 h-9 bg-coral rounded-full flex items-center justify-center cursor-pointer hover:bg-coral/90" aria-label="Upload profile photo">
              <Camera size={16} className="text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const formData = new FormData();
                    formData.append('avatar', file);

                    const response = await api.post<{ok: boolean; file?: {url: string; filename: string}; error?: string}>('/upload/avatar', formData);

                    if (response.ok && response.file) {
                      setAvatarUrl(response.file.url);
                      localStorage.setItem('profile_avatar', response.file.url);
                      
                      // Update profile in backend
                      await api.put('/profile', { avatar: response.file.url });
                    } else {
                      console.error('Avatar upload failed:', response.error);
                      alert('Failed to upload avatar. Please try again.');
                    }
                  } catch (error) {
                    console.error('Avatar upload error:', error);
                    alert('Failed to upload avatar. Please try again.');
                  }
                }}
              />
            </label>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-xl font-bold">{currentUser.name}, {currentUser.age}</h1>
              {currentUser.isVerified && (
                <div title="Verified account: authentic representation of this person" className="w-3.5 h-3.5 bg-coral rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <button onClick={onEditProfile} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors ml-1" aria-label="Edit profile">
                <Edit3 size={14} />
                </button>
            </div>

            {/* Stats under name */}
            <div className="flex space-x-6 mb-3">
              <div className="text-center">
                <div className="font-bold text-lg">{stats.posts}</div>
                <div className="text-gray-600 text-sm">posts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{stats.sparks}</div>
                <div className="text-gray-600 text-sm">sparks</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{stats.connections}</div>
                <div className="text-gray-600 text-sm">connections</div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-2 mb-4">
              {(!privacy?.privacy || privacy.privacy.showLocation !== false) && (
                <div className="flex items-center space-x-2 text-gray-600">
                <MapPin size={16} />
                <span>{currentUser.location}</span>
              </div>
              )}
              <div className="flex items-center space-x-2 text-gray-600">
                <Briefcase size={16} />
                <span>{currentUser.profession}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-coral/10 text-coral text-sm font-medium rounded-full">
                  {currentUser.connectionPreference}
                </span>
              </div>
            </div>

            {/* Bio */}
            <p className="text-gray-800 mb-4 text-left">{currentUser.bio}</p>

            {/* Interests */}
            <div className="flex flex-wrap gap-2 text-left">
              {currentUser.interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Inline action buttons removed (edit moved next to name) */}
      </div>

      {/* Highlights/Collections */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Date Ideas Collections</h2>
          <button 
            onClick={onDateIdeas}
            className="text-coral text-sm font-medium hover:underline"
          >
            View All
          </button>
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {userCollections.map((collection) => (
            <button 
              key={collection.id} 
              onClick={onDateIdeas}
              className="flex-shrink-0 text-center hover:opacity-80 transition-opacity"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-coral to-warm-pink rounded-full mb-2 flex items-center justify-center">
                <Heart size={24} className="text-white" />
              </div>
              <p className="text-xs font-medium text-gray-700">{collection.name}</p>
              <p className="text-xs text-gray-500">{collection.itemCount} items</p>
            </button>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-coral text-coral bg-coral/5'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'posts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPosts.map((post) => (
                <div key={post.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer">
                  <img
                    src={post.content[0]}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                    <div className="flex items-center space-x-1 text-white">
                      <Sparkles size={20} />
                      <span className="font-medium">{post.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'saved' && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Saved Boards</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <button onClick={() => setSavedFilter('all')} className={`px-3 py-1 rounded-full ${savedFilter==='all' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>All</button>
                    <button onClick={() => setSavedFilter('public')} className={`px-3 py-1 rounded-full ${savedFilter==='public' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>Public</button>
                    <button onClick={() => setSavedFilter('friends')} className={`px-3 py-1 rounded-full ${savedFilter==='friends' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>Friends</button>
                    <button onClick={() => setSavedFilter('private')} className={`px-3 py-1 rounded-full ${savedFilter==='private' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>Private</button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userCollections
                  .filter(c => savedFilter==='all' ? true : c.visibility===savedFilter)
                  .map((collection) => (
                  <div key={collection.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <div className="flex items-center space-x-2">
                        <Heart size={20} className="text-pink-500" />
                        <span className="font-medium text-gray-900">{collection.name}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {collection.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {collection.itemCount} items
                      </div>
                      <button 
                        onClick={() => navigate('/couple/boards')}
                        className="text-coral hover:text-coral/80 text-sm font-medium"
                      >
                        View Board
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add new board button */}
                <button 
                  onClick={() => navigate('/couple/boards')}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-coral hover:bg-coral/5 transition-colors text-center"
                >
                  <Bookmark size={24} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Create New Board</p>
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'reposts' && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Your Reposts</h3>
                  <div className="flex items-center space-x-2 text-sm">
                    <button onClick={() => setRepostsFilter('all')} className={`px-3 py-1 rounded-full ${repostsFilter==='all' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>All</button>
                    <button onClick={() => setRepostsFilter('public')} className={`px-3 py-1 rounded-full ${repostsFilter==='public' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>Public</button>
                    <button onClick={() => setRepostsFilter('friends')} className={`px-3 py-1 rounded-full ${repostsFilter==='friends' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>Friends</button>
                    <button onClick={() => setRepostsFilter('private')} className={`px-3 py-1 rounded-full ${repostsFilter==='private' ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}>Private</button>
                  </div>
                </div>
              </div>
              
              {userReposts.filter(r => repostsFilter==='all' ? true : r.visibility===repostsFilter).length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <Sparkles size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No reposts yet</h3>
                  <p className="text-gray-600">Reposts you make in the Feed will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userReposts
                    .filter(r => repostsFilter==='all' ? true : r.visibility===repostsFilter)
                    .map((repost) => (
                    <div key={repost.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-2 mb-3">
                        <img 
                          src={repost.originalPost.user?.avatar || 'https://via.placeholder.com/32x32'} 
                          alt="User" 
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {repost.originalPost.user?.name || 'User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Reposted {new Date(repost.repostedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600 capitalize">{repost.visibility}</span>
                      </div>
                      
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                        <img
                          src={repost.originalPost.content[0]}
                          alt="Reposted content"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                        {repost.originalPost.caption || 'No caption'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Sparkles size={14} />
                          <span>{repost.originalPost.likes || 0}</span>
                        </div>
                        <button className="text-coral hover:text-coral/80 font-medium">
                          View Original
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">My Groups</h3>
                  <button 
                    onClick={() => navigate('/groups')}
                    className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors"
                  >
                    <Plus size={16} />
                    Create Group
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">Manage groups you created or moderate</p>
              </div>
              
              {userGroups.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <Users size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
                  <p className="text-gray-600 mb-4">Create your first group to start building a community</p>
                  <button 
                    onClick={() => navigate('/groups')}
                    className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors"
                  >
                    Create Group
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userGroups.map((group) => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{group.name}</h4>
                            {group.isCreator && (
                              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-coral text-white">
                                <Crown size={12} />
                                Creator
                              </span>
                            )}
                            {group.isAdmin && !group.isCreator && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                Admin
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                              group.visibility === 'public' ? 'bg-green-100 text-green-700' :
                              group.visibility === 'private' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {group.visibility}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{group.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {group.memberCount} members
                            </span>
                            <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <button 
                            onClick={() => navigate(`/groups/${group.id}/manage`)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Manage Group"
                          >
                            <Settings size={16} />
                          </button>
                          <button 
                            onClick={() => navigate(`/groups/${group.id}/members`)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Manage Members"
                          >
                            <UserPlus size={16} />
                          </button>
                          {group.isCreator && (
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                                  // Handle group deletion
                                  console.log('Delete group:', group.id);
                                }
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Group"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};