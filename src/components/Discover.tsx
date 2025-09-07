import React, { useEffect, useState } from 'react';
import { Search, MapPin, Heart, Sliders, X, Globe, Star, Home, Baby, BookOpen, Calendar, Clock, Users2, Navigation, Coffee, Flag } from 'lucide-react';
import { ModerationModal } from './ModerationModal';
import { User } from '../App';
import { api } from '../lib/api';

interface DiscoverProps {
  onOpenChat: (user: User) => void;
}

export const Discover: React.FC<DiscoverProps> = ({ onOpenChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_privacy_settings') || '{}'); } catch { return {}; }
  });
  useEffect(() => {
    try { setPrivacy(JSON.parse(localStorage.getItem('app_privacy_settings') || '{}')); } catch {}
  }, []);
  
  // Advanced filter states
  const [advancedFilters, setAdvancedFilters] = useState({
    intent: [] as string[],
    lifestyle: [] as string[],
    values: [] as string[],
    religion: [] as string[],
    kids: [] as string[],
    languages: [] as string[],
    ageRange: { min: 18, max: 65 },
    distance: 50,
    onlineStatus: false
  });

  // Location context states
  const [showLocationContext, setShowLocationContext] = useState(false);
  const [userLocation] = useState('New York, NY');
  const [nearbyEvents] = useState([
    {
      id: '1',
      title: 'Coffee & Conversation Meetup',
      description: 'Join singles for coffee and meaningful conversations',
      date: '2024-01-20',
      time: '2:00 PM',
      location: 'Central Park Coffee',
      distance: '0.8 km',
      attendees: 12,
      maxAttendees: 20,
      category: 'social'
    },
    {
      id: '2',
      title: 'Weekend Hiking Adventure',
      description: 'Group hike in the mountains - perfect for meeting active singles',
      date: '2024-01-21',
      time: '9:00 AM',
      location: 'Bear Mountain',
      distance: '45 km',
      attendees: 8,
      maxAttendees: 15,
      category: 'outdoor'
    },
    {
      id: '3',
      title: 'Art Gallery Opening',
      description: 'Exclusive art exhibition with networking opportunity',
      date: '2024-01-22',
      time: '6:00 PM',
      location: 'Modern Art Museum',
      distance: '2.1 km',
      attendees: 25,
      maxAttendees: 50,
      category: 'culture'
    }
  ]);

  const [meetHalfwaySuggestions] = useState([
    {
      id: '1',
      title: 'Midpoint Coffee Shop',
      description: 'Perfect meeting point between your locations',
      location: 'Midtown Manhattan',
      distance: 'Equal distance',
      rating: 4.8,
      type: 'coffee'
    },
    {
      id: '2',
      title: 'Central Park',
      description: 'Beautiful outdoor meeting spot',
      location: 'Central Park',
      distance: 'Central location',
      rating: 4.9,
      type: 'outdoor'
    },
    {
      id: '3',
      title: 'Riverside Walk',
      description: 'Scenic walking path along the river',
      location: 'Hudson River Park',
      distance: 'Convenient access',
      rating: 4.7,
      type: 'outdoor'
    }
  ]);

  useEffect(() => {
    api.get<{ ok: boolean; users: any[] }>(`/users`).then((data) => {
      if (data?.ok && Array.isArray(data.users)) {
        const mapped: User[] = data.users.map((u: any) => ({
          id: u.id, name: u.name, age: u.age, bio: '', location: u.location, profession: u.profession,
          avatar: u.avatar, connectionPreference: u.connectionPreference, interests: u.interests || [], posts: [], isVerified: u.isVerified,
        }));
        setUsers(mapped);
      }
    }).catch(() => {});
  }, []);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'longterm', label: 'Long-term' },
    { id: 'shortterm', label: 'Short-term' },
    { id: 'friends', label: 'Friends' },
    { id: 'nearby', label: 'Nearby' },
  ];

  // Advanced filter options
  const filterOptions = {
    intent: [
      'Long-term relationship', 'Casual dating', 'Friendship', 'Marriage', 'Open to anything'
    ],
    lifestyle: [
      'Active/Outdoorsy', 'Homebody', 'Social butterfly', 'Minimalist', 'Luxury', 'Adventure seeker'
    ],
    values: [
      'Family-oriented', 'Career-focused', 'Spiritual', 'Environmental', 'Traditional', 'Progressive'
    ],
    religion: [
      'Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Atheist', 'Spiritual', 'Other'
    ],
    kids: [
      'Want children', 'Have children', 'Don\'t want children', 'Open to stepchildren'
    ],
    languages: [
      'English', 'Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Hindi', 'Portuguese'
    ]
  };

  // Helper functions for managing filters
  const toggleFilter = (category: keyof typeof advancedFilters, value: string) => {
    if (category === 'ageRange' || category === 'distance' || category === 'onlineStatus') return;
    
    setAdvancedFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const clearAllFilters = () => {
    setAdvancedFilters({
      intent: [],
      lifestyle: [],
      values: [],
      religion: [],
      kids: [],
      languages: [],
      ageRange: { min: 18, max: 65 },
      distance: 50,
      onlineStatus: false
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (advancedFilters.intent.length > 0) count += advancedFilters.intent.length;
    if (advancedFilters.lifestyle.length > 0) count += advancedFilters.lifestyle.length;
    if (advancedFilters.values.length > 0) count += advancedFilters.values.length;
    if (advancedFilters.religion.length > 0) count += advancedFilters.religion.length;
    if (advancedFilters.kids.length > 0) count += advancedFilters.kids.length;
    if (advancedFilters.languages.length > 0) count += advancedFilters.languages.length;
    if (advancedFilters.onlineStatus) count += 1;
    return count;
  };

  // Location context helper functions
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'social': return <Users2 size={16} className="text-blue-500" />;
      case 'outdoor': return <MapPin size={16} className="text-green-500" />;
      case 'culture': return <Star size={16} className="text-purple-500" />;
      default: return <Calendar size={16} className="text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-700';
      case 'outdoor': return 'bg-green-100 text-green-700';
      case 'culture': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'coffee': return <Coffee size={16} className="text-brown-500" />;
      case 'outdoor': return <MapPin size={16} className="text-green-500" />;
      default: return <MapPin size={16} className="text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const filteredUsers = users.filter(user => {
    if (privacy?.privacy?.incognito) {
      // In incognito, hide yourself from discovery results (mock: nothing to show)
      // In a real app, the backend would filter out current user from others' feeds; here we just allow viewing others.
    }
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.interests.some(interest => interest.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Basic filter matching
    let matchesBasicFilter = true;
    if (selectedFilter === 'all') matchesBasicFilter = true;
    else if (selectedFilter === 'longterm') matchesBasicFilter = user.connectionPreference === 'Long-term';
    else if (selectedFilter === 'shortterm') matchesBasicFilter = user.connectionPreference === 'Short-term';
    else if (selectedFilter === 'friends') matchesBasicFilter = user.connectionPreference === 'Friends';
    else if (selectedFilter === 'nearby') matchesBasicFilter = true; // In real app, would filter by location
    
    if (!matchesSearch || !matchesBasicFilter) return false;
    
    // Advanced filter matching
    if (advancedFilters.intent.length > 0) {
      // Mock intent matching - in real app this would come from user profile
      const userIntent = user.connectionPreference || 'Open to anything';
      if (!advancedFilters.intent.includes(userIntent)) return false;
    }
    
    if (advancedFilters.lifestyle.length > 0) {
      // Mock lifestyle matching - in real app this would come from user profile
      const userLifestyle = user.interests.includes('hiking') ? 'Active/Outdoorsy' : 'Social butterfly';
      if (!advancedFilters.lifestyle.includes(userLifestyle)) return false;
    }
    
    if (advancedFilters.values.length > 0) {
      // Mock values matching - in real app this would come from user profile
      const userValues = user.interests.includes('family') ? 'Family-oriented' : 'Career-focused';
      if (!advancedFilters.values.includes(userValues)) return false;
    }
    
    if (advancedFilters.religion.length > 0) {
      // Mock religion matching - in real app this would come from user profile
      const userReligion = 'Other'; // Placeholder
      if (!advancedFilters.religion.includes(userReligion)) return false;
    }
    
    if (advancedFilters.kids.length > 0) {
      // Mock kids matching - in real app this would come from user profile
      const userKids = 'Open to anything'; // Placeholder
      if (!advancedFilters.kids.includes(userKids)) return false;
    }
    
    if (advancedFilters.languages.length > 0) {
      // Mock language matching - in real app this would come from user profile
      const userLanguages = ['English']; // Placeholder
      if (!advancedFilters.languages.some(lang => userLanguages.includes(lang))) return false;
    }
    
    // Age range filter
    const userAge = user.age || 25;
    if (userAge < advancedFilters.ageRange.min || userAge > advancedFilters.ageRange.max) return false;
    
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search people, interests, activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-coral/20 focus:bg-white transition-all duration-200"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex space-x-1">
              <button
                onClick={() => setShowLocationContext(!showLocationContext)}
                className={`p-2 rounded-lg transition-colors ${
                  showLocationContext ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Toggle location context"
              >
                <Navigation size={18} />
              </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
                aria-label="Toggle filters"
              >
                <Sliders size={18} />
                {getActiveFilterCount() > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-coral text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {getActiveFilterCount()}
                  </div>
                )}
          </button>
            </div>
        </div>
        </div>

        {/* Location Context */}
        {showLocationContext && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Location & Events</h3>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin size={16} />
                  <span>{userLocation}</span>
                </div>
                <button
                  onClick={() => setShowLocationContext(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Nearby Events */}
            <div className="mb-8">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar size={18} className="mr-2 text-blue-500" />
                Nearby Events
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyEvents.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(event.category)}
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(event.category)}`}>
                          {event.category}
                        </span>
                      </div>
                      {(!privacy?.privacy || privacy.privacy.showDistance !== false) && (
                        <span className="text-xs text-gray-500">{event.distance}</span>
                      )}
                    </div>
                    <h5 className="font-semibold text-gray-900 mb-2">{event.title}</h5>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>{event.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Users2 size={14} />
                        <span>{event.attendees}/{event.maxAttendees}</span>
                      </div>
                      <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600 transition-colors">
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meet Halfway Suggestions */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <Navigation size={18} className="mr-2 text-green-500" />
                Meet Halfway Suggestions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetHalfwaySuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(suggestion.type)}
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          {suggestion.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star size={14} className="text-yellow-500" />
                        <span className="text-xs text-gray-600">{suggestion.rating}</span>
                      </div>
                    </div>
                    <h5 className="font-semibold text-gray-900 mb-2">{suggestion.title}</h5>
                    <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <div className="flex items-center space-x-1 mb-1">
                          <MapPin size={14} />
                          <span>{suggestion.location}</span>
                        </div>
                        <span>{suggestion.distance}</span>
                      </div>
                      <button className="px-3 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600 transition-colors">
                        Suggest
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {getActiveFilterCount()} active filters
                </span>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-coral hover:text-coral/80 font-medium"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Intent */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Heart size={16} className="mr-2 text-coral" />
                  Intent
                </label>
                <div className="space-y-2">
                  {filterOptions.intent.map(option => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={advancedFilters.intent.includes(option)}
                        onChange={() => toggleFilter('intent', option)}
                        className="rounded border-gray-300 text-coral focus:ring-coral"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lifestyle */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Home size={16} className="mr-2 text-coral" />
                  Lifestyle
                </label>
                <div className="space-y-2">
                  {filterOptions.lifestyle.map(option => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={advancedFilters.lifestyle.includes(option)}
                        onChange={() => toggleFilter('lifestyle', option)}
                        className="rounded border-gray-300 text-coral focus:ring-coral"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Values */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Star size={16} className="mr-2 text-coral" />
                  Values
                </label>
                <div className="space-y-2">
                  {filterOptions.values.map(option => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={advancedFilters.values.includes(option)}
                        onChange={() => toggleFilter('values', option)}
                        className="rounded border-gray-300 text-coral focus:ring-coral"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Religion */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <BookOpen size={16} className="mr-2 text-coral" />
                  Religion
                </label>
                <div className="space-y-2">
                  {filterOptions.religion.map(option => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={advancedFilters.religion.includes(option)}
                        onChange={() => toggleFilter('religion', option)}
                        className="rounded border-gray-300 text-coral focus:ring-coral"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Kids */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Baby size={16} className="mr-2 text-coral" />
                  Kids
                </label>
                <div className="space-y-2">
                  {filterOptions.kids.map(option => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={advancedFilters.kids.includes(option)}
                        onChange={() => toggleFilter('kids', option)}
                        className="rounded border-gray-300 text-coral focus:ring-coral"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Globe size={16} className="mr-2 text-coral" />
                  Languages
                </label>
                <div className="space-y-2">
                  {filterOptions.languages.map(option => (
                    <label key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={advancedFilters.languages.includes(option)}
                        onChange={() => toggleFilter('languages', option)}
                        className="rounded border-gray-300 text-coral focus:ring-coral"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Age Range</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    value={advancedFilters.ageRange.min}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev,
                      ageRange: { ...prev.ageRange, min: parseInt(e.target.value) || 18 }
                    }))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                    min="18"
                    max="100"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    value={advancedFilters.ageRange.max}
                    onChange={(e) => setAdvancedFilters(prev => ({
                      ...prev,
                      ageRange: { ...prev.ageRange, max: parseInt(e.target.value) || 65 }
                    }))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                    min="18"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Distance (km)</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={advancedFilters.distance}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    distance: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 km</span>
                  <span>{advancedFilters.distance} km</span>
                  <span>100 km</span>
                </div>
              </div>
            </div>

            {/* Online Status */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={advancedFilters.onlineStatus}
                  onChange={(e) => setAdvancedFilters(prev => ({
                    ...prev,
                    onlineStatus: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-coral focus:ring-coral"
                />
                <span className="text-sm font-medium text-gray-700">Show only online users</span>
              </label>
            </div>
          </div>
        )}

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''} found
            {getActiveFilterCount() > 0 && (
              <span className="ml-2 text-coral">
                • {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
              </span>
            )}
            {showLocationContext && (
              <span className="ml-2 text-blue-500">
                • Location context active
              </span>
            )}
            {privacy?.privacy?.incognito && (
              <span className="ml-2 text-gray-500">• Incognito on</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {showLocationContext && (
              <button
                onClick={() => setShowLocationContext(false)}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                Hide location context
              </button>
            )}
            {getActiveFilterCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-coral hover:text-coral/80 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-2 flex-nowrap snap-x snap-mandatory">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0 snap-center ${
                selectedFilter === filter.id
                  ? 'bg-coral text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow duration-200">
            {/* Profile Header */}
            <div className="aspect-square bg-gray-100 relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover"
              />
              <button
                className="absolute top-3 right-3 w-10 h-10 bg-white/90 rounded-full border border-white/70 flex items-center justify-center hover:bg-white transition-colors"
                aria-label="Like"
              >
                <Heart size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setReportUserId(user.id)}
                className="absolute top-3 left-3 w-10 h-10 bg-white/90 rounded-full border border-white/70 flex items-center justify-center hover:bg-white transition-colors"
                aria-label="Report"
              >
                <Flag size={18} className="text-red-500" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-base">{user.name}</h3>
                  {user.isVerified && (
                    <div title="Verified account: authentic representation of this person" className="w-3.5 h-3.5 bg-coral rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="px-2 py-1 bg-coral/10 text-coral text-xs font-medium rounded-full">
                  {user.connectionPreference}
                </span>
              </div>

              {!privacy?.privacy || privacy.privacy.showLocation !== false ? (
              <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                <MapPin size={14} />
                <span>{user.location}</span>
              </div>
              ) : null}

              <p className="text-sm text-gray-600 mb-3">{user.profession}</p>
              <p className="text-sm text-gray-800 mb-4 line-clamp-2">{user.bio}</p>

              {/* Interests */}
              <div className="flex flex-wrap gap-1 mb-4">
                {user.interests.slice(0, 3).map((interest, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {interest}
                  </span>
                ))}
                {user.interests.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    +{user.interests.length - 3} more
                  </span>
                )}
              </div>

              {/* Action Button */}
              {(!privacy?.privacy || privacy.privacy.messageMode !== 'none') ? (
              <button 
                onClick={() => onOpenChat(user)}
                  className="w-full py-3 bg-gradient-to-r from-coral to-warm-pink text-white rounded-xl font-semibold transform hover:-translate-y-0.5 transition-all duration-200"
              >
                  {privacy?.privacy?.messageMode === 'connections' ? 'Message (connections only)' : 'Send Spark'}
              </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Search size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-600">Try adjusting your search or filters to find more people.</p>
        </div>
      )}
      {reportUserId && (
        <ModerationModal targetId={reportUserId} kind="user" onClose={() => setReportUserId(null)} onSubmit={()=>{}} />
      )}
    </div>
  );
};