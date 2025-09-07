import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Sparkles, Filter, X, Star, Users, TrendingUp } from 'lucide-react';
import { User } from '../App';
import { SuggestionService, UserSuggestion, SuggestionFilters } from '../lib/suggestionService';
import { api } from '../lib/api';

interface SmartSuggestionsProps {
  onOpenChat: (user: User) => void;
  currentUserId?: string;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ onOpenChat, currentUserId }) => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SuggestionFilters>({});
  const [trendingInterests, setTrendingInterests] = useState<string[]>([]);
  const [suggestionMode, setSuggestionMode] = useState<'smart' | 'nearby' | 'trending'>('smart');

  useEffect(() => {
    fetchSuggestions();
    fetchTrendingInterests();
  }, [filters, suggestionMode]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      let newSuggestions: UserSuggestion[] = [];

      switch (suggestionMode) {
        case 'nearby':
          // Get user's location and fetch nearby users
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const nearby = await SuggestionService.getNearbyUsers(
                  position.coords.latitude,
                  position.coords.longitude,
                  50, // 50km radius
                  20
                );
                setSuggestions(nearby);
              },
              async () => {
                // Fallback to smart suggestions if location is denied
                newSuggestions = await SuggestionService.getSuggestions(currentUserId || '', filters);
                setSuggestions(newSuggestions);
              }
            );
          } else {
            newSuggestions = await SuggestionService.getSuggestions(currentUserId || '', filters);
            setSuggestions(newSuggestions);
          }
          break;
        case 'trending':
          // Get users with trending interests
          newSuggestions = await SuggestionService.getSuggestions(currentUserId || '', {
            ...filters,
            interests: trendingInterests.slice(0, 3)
          });
          setSuggestions(newSuggestions);
          break;
        default:
          // Smart suggestions based on interests and preferences
          newSuggestions = await SuggestionService.getSuggestions(currentUserId || '', filters);
          setSuggestions(newSuggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingInterests = async () => {
    try {
      const interests = await SuggestionService.getTrendingInterests();
      setTrendingInterests(interests);
    } catch (error) {
      console.error('Failed to fetch trending interests:', error);
    }
  };

  const handleConnect = async (userId: string) => {
    try {
      await api.post('/connections/request', { targetUserId: userId });
      // Remove the user from suggestions after connecting
      setSuggestions(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Failed to send connection request:', error);
    }
  };

  const handleSpark = async (userId: string) => {
    try {
      await api.post('/sparks/send', { targetUserId: userId });
      // You could show a success message here
    } catch (error) {
      console.error('Failed to send spark:', error);
    }
  };

  const updateFilters = (newFilters: Partial<SuggestionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto mb-4"></div>
        <p className="text-gray-600">Finding perfect matches for you...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suggestion Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setSuggestionMode('smart')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              suggestionMode === 'smart'
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={16} className="inline mr-2" />
            Smart Matches
          </button>
          <button
            onClick={() => setSuggestionMode('nearby')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              suggestionMode === 'nearby'
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MapPin size={16} className="inline mr-2" />
            Nearby
          </button>
          <button
            onClick={() => setSuggestionMode('trending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              suggestionMode === 'trending'
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp size={16} className="inline mr-2" />
            Trending
          </button>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filter Suggestions</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={filters.ageRange?.[0] || ''}
                  onChange={(e) => updateFilters({
                    ageRange: [parseInt(e.target.value) || 18, filters.ageRange?.[1] || 35]
                  })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={filters.ageRange?.[1] || ''}
                  onChange={(e) => updateFilters({
                    ageRange: [filters.ageRange?.[0] || 18, parseInt(e.target.value) || 35]
                  })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                placeholder="City, Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={filters.location || ''}
                onChange={(e) => updateFilters({ location: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Connection Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={filters.connectionPreference || ''}
                onChange={(e) => updateFilters({ connectionPreference: e.target.value })}
              >
                <option value="">Any</option>
                <option value="Long-term">Long-term</option>
                <option value="Short-term">Short-term</option>
                <option value="Friends">Friends</option>
                <option value="Casual">Casual</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="verifiedOnly"
              checked={filters.verifiedOnly || false}
              onChange={(e) => updateFilters({ verifiedOnly: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="verifiedOnly" className="text-sm text-gray-700">
              Show only verified users
            </label>
          </div>
        </div>
      )}

      {/* Trending Interests */}
      {suggestionMode === 'trending' && trendingInterests.length > 0 && (
        <div className="bg-gradient-to-r from-coral to-warm-pink rounded-xl p-4 text-white">
          <h3 className="font-semibold mb-2 flex items-center">
            <TrendingUp size={20} className="mr-2" />
            Trending Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingInterests.slice(0, 5).map((interest, index) => (
              <span
                key={interest}
                className="px-3 py-1 bg-white/20 rounded-full text-sm"
              >
                #{interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions Grid */}
      {suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No suggestions found</h3>
          <p className="text-gray-600">Try adjusting your filters or check back later for new matches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((user) => (
            <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      {user.name}
                      {user.isVerified && <Star size={16} className="ml-1 text-blue-500" />}
                    </h3>
                    <p className="text-sm text-gray-600">{user.age} • {user.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-coral">{user.matchScore}% match</div>
                </div>
              </div>

              {user.bio && (
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">{user.bio}</p>
              )}

              {user.interests.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {user.interests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {interest}
                    </span>
                  ))}
                  {user.interests.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      +{user.interests.length - 3}
                    </span>
                  )}
                </div>
              )}

              {user.matchReasons.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Why you might connect:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {user.matchReasons.slice(0, 2).map((reason, index) => (
                      <li key={index} className="flex items-center">
                        <Sparkles size={12} className="mr-1 text-coral" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleConnect(user.id)}
                  className="flex-1 py-2 px-4 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors"
                >
                  Connect
                </button>
                <button
                  onClick={() => handleSpark(user.id)}
                  className="py-2 px-4 border border-coral text-coral rounded-lg text-sm font-medium hover:bg-coral hover:text-white transition-colors"
                >
                  <Sparkles size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;
