import React, { useState } from 'react';
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share, MoreHorizontal, MapPin, Clock } from 'lucide-react';
import { User, Post } from '../App';

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  onOpenChat: (user: User) => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, onBack, onOpenChat }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likes);
  const [isSaved, setIsSaved] = useState(false);

  const handleSpark = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
  };

  const mockComments = [
    {
      id: '1',
      user: { name: 'Alex Chen', avatar: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' },
      text: 'This looks amazing! What trail is this?',
      timestamp: '1 hour ago',
      likes: 5
    },
    {
      id: '2',
      user: { name: 'Maya Patel', avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' },
      text: 'I need to add this to my hiking bucket list! 🥾',
      timestamp: '45 minutes ago',
      likes: 3
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold">Post</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img
              src={post.user.avatar}
              alt={post.user.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-coral/20"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{post.user.name}</h3>
                {post.user.isVerified && (
                  <div className="w-4 h-4 bg-coral rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">{post.user.age} • {post.user.location}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChat(post.user)}
            className="px-4 py-2 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors"
          >
            Spark
          </button>
        </div>

        {/* Post Image */}
        <div className="aspect-square bg-gray-100">
          <img
            src={post.content[0]}
            alt="Post content"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Post Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleSpark}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isLiked 
                    ? 'text-coral bg-coral/10 scale-110' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-coral'
                }`}
              >
                <Heart size={28} className={isLiked ? 'fill-current' : ''} />
              </button>
              <button 
                onClick={() => onOpenChat(post.user)}
                className="p-2 text-gray-700 hover:bg-gray-100 hover:text-coral rounded-full transition-colors"
              >
                <MessageCircle size={28} />
              </button>
              <button className="p-2 text-gray-700 hover:bg-gray-100 hover:text-coral rounded-full transition-colors">
                <Share size={28} />
              </button>
            </div>
            <button 
              onClick={handleSave}
              className={`p-2 rounded-full transition-colors ${
                isSaved ? 'text-coral bg-coral/10' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bookmark size={28} className={isSaved ? 'fill-current' : ''} />
            </button>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm">{likes} sparks</p>
            <div>
              <span className="font-semibold text-sm">{post.user.name}</span>
              <span className="text-sm text-gray-700 ml-2">{post.caption}</span>
            </div>
            
            {/* Activity Tags */}
            {post.activityTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.activityTags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-sunset/10 text-sunset text-sm font-medium rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Post Meta */}
            <div className="flex items-center space-x-4 text-sm text-gray-500 pt-2">
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span>{post.timestamp}</span>
              </div>
              {post.location && (
                <div className="flex items-center space-x-1">
                  <MapPin size={14} />
                  <span>{post.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="border-t border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>
          <div className="space-y-4 mb-4">
            {mockComments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3">
                <img
                  src={comment.user.avatar}
                  alt={comment.user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2">
                    <span className="font-semibold text-sm">{comment.user.name}</span>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>{comment.timestamp}</span>
                    <button className="hover:text-coral transition-colors">Like</button>
                    <button className="hover:text-coral transition-colors">Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <div className="flex items-center space-x-3">
            <img
              src="https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover"
            />
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-coral/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};