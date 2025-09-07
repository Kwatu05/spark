import React, { useState } from 'react';
import { Bookmark, Plus, MapPin, Clock, Users, X } from 'lucide-react';
import { Post } from '../App';

interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  duration: string;
  groupSize: string;
  image: string;
  savedFrom?: Post;
  isCustom: boolean;
}

export const DateIdeas: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const mockDateIdeas: DateIdea[] = [
    {
      id: '1',
      title: 'Morning Hike Adventure',
      description: 'Explore scenic trails and enjoy breathtaking views together',
      category: 'Outdoor',
      location: 'Lake District',
      duration: '3-4 hours',
      groupSize: '2 people',
      image: 'https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      savedFrom: mockPosts[0],
      isCustom: false
    },
    {
      id: '2',
      title: 'Cooking Class Date',
      description: 'Learn to make pasta from scratch in a fun, interactive setting',
      category: 'Food',
      location: 'City Center',
      duration: '2 hours',
      groupSize: '2-4 people',
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      savedFrom: mockPosts[1],
      isCustom: false
    },
    {
      id: '3',
      title: 'Jazz Bar Evening',
      description: 'Intimate setting with live music and craft cocktails',
      category: 'Nightlife',
      location: 'Birmingham',
      duration: '2-3 hours',
      groupSize: '2 people',
      image: 'https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      savedFrom: mockPosts[2],
      isCustom: false
    },
    {
      id: '4',
      title: 'Rock Climbing Session',
      description: 'Challenge yourselves together at an indoor climbing gym',
      category: 'Active',
      location: 'Edinburgh',
      duration: '2 hours',
      groupSize: '2 people',
      image: 'https://images.pexels.com/photos/1431822/pexels-photo-1431822.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      savedFrom: mockPosts[3],
      isCustom: false
    },
    {
      id: '5',
      title: 'Sunrise Yoga',
      description: 'Start the day with mindful movement by the water',
      category: 'Wellness',
      location: 'Bristol Harbourside',
      duration: '1.5 hours',
      groupSize: '2-6 people',
      image: 'https://images.pexels.com/photos/317155/pexels-photo-317155.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      savedFrom: mockPosts[4],
      isCustom: false
    },
    {
      id: '6',
      title: 'Architecture Walking Tour',
      description: 'Discover the city\'s hidden architectural gems together',
      category: 'Culture',
      location: 'Glasgow',
      duration: '2-3 hours',
      groupSize: '2-8 people',
      image: 'https://images.pexels.com/photos/1797121/pexels-photo-1797121.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      savedFrom: mockPosts[5],
      isCustom: false
    }
  ];

  const [dateIdeas] = useState<DateIdea[]>(mockDateIdeas);

  const categories = [
    { id: 'all', label: 'All Ideas' },
    { id: 'Outdoor', label: 'Outdoor' },
    { id: 'Food', label: 'Food & Drink' },
    { id: 'Culture', label: 'Culture' },
    { id: 'Active', label: 'Active' },
    { id: 'Nightlife', label: 'Nightlife' },
    { id: 'Wellness', label: 'Wellness' }
  ];

  const filteredIdeas = selectedCategory === 'all' 
    ? dateIdeas 
    : dateIdeas.filter(idea => idea.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Date Ideas</h1>
          <p className="text-gray-600">Saved ideas and inspiration for your next adventure</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Add Idea</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2 flex-nowrap snap-x snap-mandatory">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 snap-center ${
                selectedCategory === category.id
                  ? 'bg-coral text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Ideas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIdeas.map((idea) => (
          <div key={idea.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow duration-200">
            {/* Image */}
            <div className="aspect-video bg-gray-100 relative">
              <img
                src={idea.image}
                alt={idea.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full">
                <Bookmark size={16} className="text-coral" />
              </div>
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                {idea.category}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{idea.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{idea.description}</p>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin size={14} />
                  <span>{idea.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock size={14} />
                  <span>{idea.duration}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users size={14} />
                  <span>{idea.groupSize}</span>
                </div>
              </div>

              {/* Saved From */}
              {idea.savedFrom && (
                <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-50 rounded-lg">
                  <img
                    src={idea.savedFrom.user.avatar}
                    alt={idea.savedFrom.user.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-gray-600">
                    Saved from {idea.savedFrom.user.name}'s post
                  </span>
                </div>
              )}

              {/* Action Button */}
              <button className="w-full py-3 bg-gradient-to-r from-coral to-warm-pink text-white rounded-xl font-semibold transform hover:-translate-y-0.5 transition-all duration-200">
                Plan This Date
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredIdeas.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Bookmark size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No date ideas yet</h3>
          <p className="text-gray-600 mb-4">Start saving posts that inspire you for future dates!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors"
          >
            Create Your First Idea
          </button>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create Date Idea</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Custom date idea creation would be implemented here.</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full py-3 bg-coral text-white rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};