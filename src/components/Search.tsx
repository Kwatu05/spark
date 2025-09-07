import React, { useState } from 'react';
import { Search as SearchIcon, X, Clock, TrendingUp } from 'lucide-react';
import { User } from '../App';

interface SearchProps {
  onOpenChat: (user: User) => void;
}

export const Search: React.FC<SearchProps> = ({ onOpenChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([
    'hiking adventures',
    'coffee lovers',
    'yoga enthusiasts',
    'food photographers'
  ]);

  const trendingSearches = [
    '#RockClimbing',
    '#WineTasting',
    '#ComedyShows',
    '#Hiking',
    '#Cooking',
    '#Photography',
    '#Museums',
    '#LiveMusic'
  ];

  const recentSearches = [
    'Emma Thompson',
    'hiking in London',
    'graphic designers',
    'yoga instructors'
  ];

  const clearSearch = () => {
    setSearchQuery('');
  };

  const removeFromHistory = (item: string) => {
    setSearchHistory(searchHistory.filter(h => h !== item));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // In real app, this would trigger search API
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search people, interests, activities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-12 py-4 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-coral/20 focus:bg-white transition-all duration-200 text-lg"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        )}
      </div>

      {!searchQuery ? (
        <div className="space-y-6">
          {/* Trending Searches */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp size={20} className="text-coral" />
              <h2 className="text-lg font-semibold text-gray-900">Trending Now</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((trend, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(trend)}
                  className="px-4 py-2 bg-gradient-to-r from-coral/10 to-warm-pink/10 text-coral rounded-full hover:from-coral/20 hover:to-warm-pink/20 transition-all duration-200 font-medium"
                >
                  {trend}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Clock size={20} className="text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Recent</h2>
            </div>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <button
                    onClick={() => handleSearch(search)}
                    className="flex items-center space-x-3 flex-1 text-left"
                  >
                    <SearchIcon size={16} className="text-gray-400" />
                    <span className="text-gray-700">{search}</span>
                  </button>
                  <button
                    onClick={() => removeFromHistory(search)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Categories */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Categories</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Outdoor Adventures', emoji: '🏔️', color: 'from-green-400 to-green-600' },
                { name: 'Food & Drink', emoji: '🍷', color: 'from-orange-400 to-orange-600' },
                { name: 'Arts & Culture', emoji: '🎨', color: 'from-purple-400 to-purple-600' },
                { name: 'Fitness & Wellness', emoji: '💪', color: 'from-blue-400 to-blue-600' },
                { name: 'Music & Events', emoji: '🎵', color: 'from-pink-400 to-pink-600' },
                { name: 'Travel & Explore', emoji: '✈️', color: 'from-indigo-400 to-indigo-600' }
              ].map((category, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(category.name.toLowerCase())}
                  className={`p-4 bg-gradient-to-r ${category.color} text-white rounded-xl transform hover:-translate-y-1 transition-all duration-200`}
                >
                  <div className="text-2xl mb-2">{category.emoji}</div>
                  <div className="font-semibold text-sm">{category.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Results */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Results for "{searchQuery}"
            </h2>
            <div className="space-y-4">
              {mockUsers.slice(0, 3).map((user) => (
                <div key={user.id} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-gray-200 transition-shadow">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{user.name}, {user.age}</h3>
                    <p className="text-sm text-gray-600">{user.location} • {user.profession}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.interests.slice(0, 3).map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenChat(user)}
                    className="px-4 py-2 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors"
                  >
                    Spark
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};