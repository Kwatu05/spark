import React, { useEffect, useMemo, useState } from 'react';
import { Repeat2, Sparkles } from 'lucide-react';
import { Post } from '../App';
import { api } from '../lib/api';

type RepostRecord = {
  postId: string;
  at: number;
};

const REPOSTS_STORAGE_KEY = 'reposts';

export const ProfileReposts: React.FC = () => {
  const [repostIds, setRepostIds] = useState<string[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepostedPosts = async () => {
      try {
        setLoading(true);
        // Get repost IDs from localStorage
        const raw = localStorage.getItem(REPOSTS_STORAGE_KEY);
        if (raw) {
          const parsed: RepostRecord[] = JSON.parse(raw);
          const ids = parsed.filter(r => !!r?.postId).map(r => r.postId);
          setRepostIds(ids);
          
          // Fetch the actual posts from the API
          if (ids.length > 0) {
            const response = await api.get<{ok: boolean; posts: any[]}>(`/posts/reposted?ids=${ids.join(',')}`);
            if (response.ok && Array.isArray(response.posts)) {
              const mapped: Post[] = response.posts.map((p: any) => ({
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
              setRepostedPosts(mapped);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch reposted posts:', error);
        setRepostedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepostedPosts();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto mb-4"></div>
        <p className="text-gray-600">Loading reposts...</p>
      </div>
    );
  }

  if (repostedPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <Repeat2 size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reposts yet</h3>
        <p className="text-gray-600">Repost posts from your feed to see them here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {repostedPosts.map(post => (
        <div key={post.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
          <img src={post.content[0]} alt="Post" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-1 text-white">
              <Sparkles size={18} />
              <span className="font-medium text-sm">{post.likes}</span>
            </div>
            <div className="flex items-center space-x-1 text-white">
              <Repeat2 size={18} />
              <span className="font-medium text-sm">1</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileReposts;


