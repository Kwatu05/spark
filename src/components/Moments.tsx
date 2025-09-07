import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageCircle, Share, MoreVertical, Volume2, VolumeX, Repeat2, Flag } from 'lucide-react';
import { User } from '../App';
import { api } from '../lib/api';

interface MomentVideo {
  id: string;
  user: User;
  videoUrl: string;
  title: string;
  description: string;
  likes: number;
  isLiked: boolean;
  activityTags: string[];
}

interface MomentsProps {
  onOpenChat: (user: User) => void;
}

export const Moments: React.FC<MomentsProps> = ({ onOpenChat }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const [moments, setMoments] = useState<MomentVideo[]>([]);
  const [reposts, setReposts] = useState<Record<string, { count: number; isReposted: boolean }>>({});

  useEffect(() => {
    api.get<{ ok: boolean; moments: { id: string; videoUrl: string; likes: number; isLiked: boolean; coAuthorId?: string; user: User }[] }>(`/moments`)
      .then((data) => {
        if (data?.ok && Array.isArray(data.moments)) {
          const mapped: MomentVideo[] = data.moments.map((m) => ({
            id: m.id,
            user: m.user,
            videoUrl: m.videoUrl,
            title: '',
            description: '',
            likes: m.likes,
            isLiked: m.isLiked,
            activityTags: [],
          }));
          setMoments(mapped);
        }
      })
      .catch(() => {
        // If API fails, set empty array instead of mock data
        setMoments([]);
      });
  }, []);

  useEffect(() => {
    // Play current video and pause others
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(console.error);
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentIndex < moments.length - 1) setCurrentIndex(i => i + 1);
      if (e.key === 'ArrowUp' && currentIndex > 0) setCurrentIndex(i => i - 1);
      if (e.key === 'Escape') setShowActions(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, [currentIndex, moments.length]);

  const handleSpark = (momentId: string) => {
    setMoments(moments.map(moment => 
      moment.id === momentId 
        ? { ...moment, isLiked: !moment.isLiked, likes: moment.isLiked ? moment.likes - 1 : moment.likes + 1 }
        : moment
    ));
    api.post(`/moments/${momentId}/like`).catch(() => {
      // revert on failure
      setMoments(prev => prev.map(moment => 
        moment.id === momentId 
          ? { ...moment, isLiked: !moment.isLiked, likes: moment.isLiked ? moment.likes - 1 : moment.likes + 1 }
          : moment
      ));
    });
  };

  const handleRepost = (momentId: string) => {
    setReposts(prev => {
      const current = prev[momentId] ?? { count: 0, isReposted: false };
      const nextIsReposted = !current.isReposted;
      return {
        ...prev,
        [momentId]: {
          count: nextIsReposted ? current.count + 1 : Math.max(0, current.count - 1),
          isReposted: nextIsReposted
        }
      };
    });
  };

  const handleScroll = (e: React.WheelEvent) => {
    if (e.deltaY > 0 && currentIndex < moments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentMoment = moments[currentIndex];

  // Show empty state if no moments
  if (moments.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center text-white">
          <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Moments Yet</h2>
          <p className="text-white/70">Check back later for new moments from your connections!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50" onWheel={handleScroll}
      onTouchStart={(e) => { touchStartYRef.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (touchStartYRef.current == null) return;
        const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
        const threshold = 40;
        if (deltaY < -threshold && currentIndex < moments.length - 1) setCurrentIndex(i => i + 1);
        if (deltaY > threshold && currentIndex > 0) setCurrentIndex(i => i - 1);
        touchStartYRef.current = null;
      }}
    >
      <div className="relative h-full w-full flex items-center justify-center">
        {/* Video Container */}
        <div className="relative w-full max-w-sm h-full bg-black flex items-center justify-center"
          onDoubleClick={() => handleSpark(currentMoment.id)}
        >
          {/* Background placeholder for video */}
          <div className="w-full h-full bg-gradient-to-br from-coral/20 via-warm-pink/20 to-sunset/20" />
          
          {/* Video overlay would go here in real implementation */}
          <video
            ref={(el) => (videoRefs.current[currentIndex] = el)}
            className="absolute inset-0 w-full h-full object-cover opacity-0"
            src={currentMoment.videoUrl}
            loop
            muted={isMuted}
            playsInline
          />

          {/* Left side - User info and actions */}
          <div className="absolute left-4 bottom-20 z-10">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={currentMoment.user.avatar}
                alt={currentMoment.user.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30"
              />
              <div>
                <h3 className="text-white font-semibold">{currentMoment.user.name}</h3>
                <p className="text-white/70 text-sm">{currentMoment.user.age} • {currentMoment.user.location}</p>
              </div>
            </div>
            {/* Co-author pill if present */}
            {/* In a real app we'd resolve ID to user */}
            {/* Displayed below description for simplicity */}
            
            <div className="max-w-xs">
              <p className="text-white text-sm mb-2">{currentMoment.description}</p>
              <div className="flex flex-wrap gap-1">
                {currentMoment.activityTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white/20 text-white text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="absolute right-4 bottom-20 z-10 flex flex-col items-center space-y-3">
            <button aria-label="Like (Spark)"
              onClick={() => handleSpark(currentMoment.id)}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                currentMoment.isLiked
                  ? 'bg-coral text-white scale-110'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Sparkles size={22} className={currentMoment.isLiked ? 'fill-current' : ''} />
            </button>
            <span className="text-white text-[10px] font-medium">{currentMoment.likes}</span>

            <button aria-label="Repost"
              onClick={() => handleRepost(currentMoment.id)}
              className={`p-2.5 rounded-full transition-colors ${
                reposts[currentMoment.id]?.isReposted ? 'bg-coral text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Repeat2 size={22} />
            </button>
            <span className="text-white text-[10px] font-medium">{reposts[currentMoment.id]?.count ?? 0}</span>

            <button aria-label="Message"
              onClick={() => onOpenChat(currentMoment.user)}
              className="p-2.5 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
            >
              <MessageCircle size={22} />
            </button>

            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2.5 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                aria-label="More actions"
              >
                <MoreVertical size={22} />
              </button>
              {showActions && (
                <div className="absolute right-full mr-2 bottom-0 bg-white/95 text-gray-900 rounded-xl backdrop-blur-sm border border-white/70 w-40 py-2 origin-bottom-right animate-fade-in">
                  <button
                    onClick={() => { setShowActions(false); /* share action */ }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Share size={16} />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={() => { setShowActions(false); api.post(`/moments/${currentMoment.id}/report`).catch(() => {}); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Flag size={16} />
                    <span>Report</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top-right - Volume */}
          <div className="absolute right-4 top-4 z-10">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
              aria-label="Toggle sound"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Top-left - Spark button */}
          <div className="absolute left-4 top-4 z-10">
            <button
              onClick={() => onOpenChat(currentMoment.user)}
              className="px-4 py-2 bg-gradient-to-r from-coral to-warm-pink text-white rounded-full font-semibold text-sm transition-all duration-200"
            >
              ✨ Spark
            </button>
          </div>

          {/* Progress indicators */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
            {moments.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1 h-8 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};