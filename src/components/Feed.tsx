import React, { useEffect, useState } from 'react';
import { Sparkles, Bookmark, MoreHorizontal, MapPin, Clock, Repeat2, MessageSquare } from 'lucide-react';
import { ModerationModal } from './ModerationModal';
import { User, Post } from '../App';
import { mockPosts } from '../data/mockData';
import { api } from '../lib/api';
import { CommentsModal } from './CommentsModal';
import { SaveModal } from './SaveModal';
import { trackEvent } from '../lib/experiments';

interface FeedProps {
  onOpenChat: (user: User) => void;
}

export const Feed: React.FC<FeedProps> = ({ onOpenChat }) => {
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [mode, setMode] = useState<'recency' | 'explore' | 'nearby' | 'graph'>('recency');
  const [privacy, setPrivacy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_privacy_settings') || '{}'); } catch { return {}; }
  });
  useEffect(() => {
    try { setPrivacy(JSON.parse(localStorage.getItem('app_privacy_settings') || '{}')); } catch {}
  }, []);
  const [reposts, setReposts] = useState<Record<string, { count: number; isReposted: boolean }>>(() => {
    const base = Object.fromEntries(mockPosts.map(p => [p.id, { count: 0, isReposted: false }]));
    try {
      const raw = localStorage.getItem('reposts');
      if (raw) {
        const parsed: { postId: string; at: number }[] = JSON.parse(raw);
        parsed.forEach(r => {
          if (base[r.postId]) base[r.postId].isReposted = true;
        });
      }
    } catch {}
    return base;
  });
  const [lastTapByPostId, setLastTapByPostId] = useState<Record<string, number>>({});
  const [showBurstByPostId, setShowBurstByPostId] = useState<Record<string, boolean>>({});
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [openSaveFor, setOpenSaveFor] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    api.get<{ ok: boolean; posts: any[] }>(`/feed?mode=${mode}`).then((data) => {
      if (data?.ok && Array.isArray(data.posts)) {
        const mapped: Post[] = data.posts.map((p: any) => ({
          id: p.id,
          userId: p.user?.id || 'u',
          user: { 
            id: p.user?.id || 'u', 
            name: p.user?.name || 'User', 
            age: 0, 
            bio: '', 
            location: '', 
            profession: '', 
            avatar: p.user?.avatar || 'https://placehold.co/64', 
            connectionPreference: '', 
            interests: [], 
            posts: [] 
          },
          type: p.type?.toLowerCase() || 'photo',
          content: p.content || [],
          caption: p.caption || '',
          activityTags: p.activityTags || [],
          likes: p.likes || 0,
          isLiked: Boolean(p.isLiked),
          timestamp: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'now',
        }));
        setPosts(mapped);
      }
    }).catch((error) => {
      console.error('Failed to fetch feed:', error);
    });
  }, [mode]);

  const handleSpark = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const wasLiked = post?.isLiked;
    
    // Optimistic update
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
    
    // Track spark event
    trackEvent('post_spark', { 
      postId, 
      action: wasLiked ? 'unspark' : 'spark',
      userId: post?.userId 
    });
    
    try {
      const response = await api.post<{ok: boolean; isLiked: boolean; likes: number}>(`/feed/${postId}/like`);
      if (response.ok) {
        // Update with actual server response
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, isLiked: response.isLiked, likes: response.likes }
            : post
        ));
      } else {
        // Revert optimistic update on error
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Failed to like post:', error);
      // Revert optimistic update on error
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      ));
    }
  };

  const handleMessage = async (user: User) => {
    try { await api.post('/messages/start', { userId: user.id }); } catch {}
    trackEvent('connection_initiated', { targetUserId: user.id });
    onOpenChat(user);
  };

  const handleRepost = (postId: string) => {
    setReposts(prev => {
      const current = prev[postId] ?? { count: 0, isReposted: false };
      const nextIsReposted = !current.isReposted;
      const next = {
        ...prev,
        [postId]: {
          count: nextIsReposted ? current.count + 1 : Math.max(0, current.count - 1),
          isReposted: nextIsReposted
        }
      };
      try {
        const raw = localStorage.getItem('reposts');
        const list: { postId: string; at: number }[] = raw ? JSON.parse(raw) : [];
        if (nextIsReposted) {
          if (!list.find(r => r.postId === postId)) list.unshift({ postId, at: Date.now() });
        } else {
          const idx = list.findIndex(r => r.postId === postId);
          if (idx >= 0) list.splice(idx, 1);
        }
        localStorage.setItem('reposts', JSON.stringify(list));
      } catch {}
      return next;
    });
    api.post(`/feed/${postId}/repost`).catch(() => {
      // best-effort rollback of storage
      try {
        const raw = localStorage.getItem('reposts');
        const list: { postId: string; at: number }[] = raw ? JSON.parse(raw) : [];
        const exists = list.find(r => r.postId === postId);
        if (exists) {
          // remove
          localStorage.setItem('reposts', JSON.stringify(list.filter(r => r.postId !== postId)));
        } else {
          // add back
          localStorage.setItem('reposts', JSON.stringify([{ postId, at: Date.now() }, ...list]));
        }
      } catch {}
      setReposts(prev => {
        const current = prev[postId] ?? { count: 0, isReposted: false };
        const nextIsReposted = !current.isReposted;
        return {
          ...prev,
          [postId]: {
            count: nextIsReposted ? current.count + 1 : Math.max(0, current.count - 1),
            isReposted: nextIsReposted
          }
        };
      });
    });
  };

  const triggerSparkleBurst = (postId: string) => {
    setShowBurstByPostId(prev => ({ ...prev, [postId]: true }));
    window.setTimeout(() => {
      setShowBurstByPostId(prev => ({ ...prev, [postId]: false }));
    }, 600);
  };

  const handleImageTap = (post: Post) => {
    const now = Date.now();
    const lastTap = lastTapByPostId[post.id] ?? 0;
    if (now - lastTap < 300) {
      if (!post.isLiked) {
        handleSpark(post.id);
      }
      triggerSparkleBurst(post.id);
    }
    setLastTapByPostId(prev => ({ ...prev, [post.id]: now }));
  };

  const handleImageDoubleClick = (post: Post) => {
    if (!post.isLiked) {
      handleSpark(post.id);
    }
    triggerSparkleBurst(post.id);
  };

  const handleReportSubmit = async (reason: string, details: string) => {
    if (!reportFor) return;
    try {
      setIsSubmittingReport(true);
      await api.post('/moderation/reports', { targetId: reportFor, kind: 'post', reason, details });
    } catch {}
    finally {
      setIsSubmittingReport(false);
      setReportFor(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm mb-4">
        <span className="text-gray-600">Feed mode:</span>
        {(['recency','explore','nearby','graph'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full border ${mode===m ? 'bg-coral text-white border-coral' : 'border-gray-200 text-gray-700'}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Post Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { window.location.assign(`/u/${post.user.id}`); }}>
                <img
                  src={post.user.avatar}
                  alt={post.user.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-coral/20"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{post.user.name}</h3>
                    {post.user.isVerified && (
                      <div title="Verified account: authentic representation of this person" className="w-3.5 h-3.5 bg-coral rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {(!privacy?.privacy || privacy.privacy.showAge !== false) ? post.user.age : ''}
                    {(!privacy?.privacy || privacy.privacy.showAge !== false) && (!privacy?.privacy || privacy.privacy.showLocation !== false) ? ' • ' : ''}
                    {(!privacy?.privacy || privacy.privacy.showLocation !== false) ? post.user.location : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {post.user.connectionPreference && (
                  <span className="px-2 py-1 bg-coral/10 text-coral text-xs font-medium rounded-full">
                    {post.user.connectionPreference}
                  </span>
                )}
                <div className="relative">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setReportFor(post.id)}>
                    <MoreHorizontal size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div 
              className="aspect-square bg-gray-100 relative select-none"
              onClick={() => handleImageTap(post)}
              onDoubleClick={() => handleImageDoubleClick(post)}
            >
              <img
                src={post.content[0]}
                alt="Post content"
                className="w-full h-full object-cover"
              />
              {showBurstByPostId[post.id] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Sparkles size={84} className="text-coral opacity-80 animate-ping" />
                </div>
              )}
            </div>

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => handleSpark(post.id)}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      post.isLiked 
                        ? 'text-coral bg-coral/10 scale-110' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-coral'
                    }`}
                  >
                    <Sparkles size={24} className={post.isLiked ? 'fill-current' : ''} />
                  </button>
                  <button 
                    onClick={() => setOpenCommentsFor(post.id)}
                    className="p-2 text-gray-700 hover:bg-gray-100 hover:text-coral rounded-full transition-colors"
                    aria-label="Comments"
                  >
                    <MessageSquare size={24} />
                  </button>
                  <button 
                    onClick={() => handleRepost(post.id)}
                    className={`p-2 rounded-full transition-colors ${
                      reposts[post.id]?.isReposted ? 'text-coral bg-coral/10' : 'text-gray-700 hover:bg-gray-100 hover:text-coral'
                    }`}
                  >
                    <Repeat2 size={24} />
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setOpenSaveFor(post.id)} className="p-2 text-gray-700 hover:bg-gray-100 hover:text-coral rounded-full transition-colors" aria-label="Save">
                    <Bookmark size={24} />
                  </button>
                  {(!privacy?.privacy || privacy.privacy.allowMessages !== false) ? (
                    <button 
                      onClick={() => handleMessage(post.user)}
                      className="px-6 py-2 bg-gradient-to-r from-coral to-warm-pink text-white rounded-full font-semibold transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Spark
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm flex items-center space-x-3">
                  <span>{post.likes} sparks</span>
                  <span className="text-gray-500">·</span>
                  <span>{reposts[post.id]?.count ?? 0} reposts</span>
                </p>
                {/* Comments moved to modal */}
                <div>
                  <span className="font-semibold text-sm">{post.user.name}</span>
                  <span className="text-sm text-gray-700 ml-2">{post.caption}</span>
                </div>
                
                {/* Activity Tags */}
                {post.activityTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.activityTags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-sunset/10 text-sunset text-xs font-medium rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Post Meta */}
                <div className="flex items-center space-x-4 text-xs text-gray-500 pt-2">
                  <div className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{post.timestamp}</span>
                  </div>
                  {post.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} />
                      <span>{post.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {openCommentsFor && (
        <CommentsModal postId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />
      )}
      {openSaveFor && (
        <SaveModal postId={openSaveFor} onClose={() => setOpenSaveFor(null)} />
      )}
      {reportFor && (
        <ModerationModal targetId={reportFor} kind="post" onClose={() => setReportFor(null)} onSubmit={handleReportSubmit} />
      )}
      {isSubmittingReport && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="px-3 py-1 rounded bg-black/60 text-white text-xs">Submitting report…</div>
        </div>
      )}
    </div>
  );
};