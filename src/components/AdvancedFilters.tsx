import React, { useState } from 'react';
import { X, Sliders } from 'lucide-react';

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ isOpen, onClose, onApplyFilters }) => {
  const [filters, setFilters] = useState({
    ageRange: [22, 35],
    distance: 25,
    education: '',
    profession: '',
    interests: [] as string[],
    connectionType: '',
    hasPhotos: true,
    isVerified: false,
    recentlyActive: false
  });

  const educationLevels = [
    'High School',
    'Some College',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'PhD',
    'Trade School',
    'Other'
  ];

  const connectionTypes = [
    'Long-term',
    'Short-term',
    'Friends',
    'Casual',
    'Not sure'
  ];

  const popularInterests = [
    'Hiking', 'Photography', 'Coffee', 'Travel', 'Art', 'Yoga',
    'Cooking', 'Wine', 'Music', 'Dancing', 'Fitness', 'Reading'
  ];

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const resetFilters = () => {
    setFilters({
      ageRange: [22, 35],
      distance: 25,
      education: '',
      profession: '',
      interests: [],
      connectionType: '',
      hasPhotos: true,
      isVerified: false,
      recentlyActive: false
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-t-2xl w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Sliders size={20} className="text-coral" />
            <span>Filters</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
            </label>
            <div className="px-3">
              <input
                type="range"
                min="18"
                max="50"
                value={filters.ageRange[1]}
                onChange={(e) => setFilters({
                  ...filters,
                  ageRange: [filters.ageRange[0], parseInt(e.target.value)]
                })}
                className="w-full accent-coral"
              />
            </div>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Maximum Distance: {filters.distance} km
            </label>
            <div className="px-3">
              <input
                type="range"
                min="5"
                max="100"
                value={filters.distance}
                onChange={(e) => setFilters({
                  ...filters,
                  distance: parseInt(e.target.value)
                })}
                className="w-full accent-coral"
              />
            </div>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Looking For</label>
            <div className="grid grid-cols-2 gap-2">
              {connectionTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({
                    ...filters,
                    connectionType: filters.connectionType === type ? '' : type
                  })}
                  className={`p-3 rounded-xl border-2 font-medium transition-colors text-sm ${
                    filters.connectionType === type
                      ? 'border-coral bg-coral text-white'
                      : 'border-gray-200 text-gray-700 hover:border-coral'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Education</label>
            <select
              value={filters.education}
              onChange={(e) => setFilters({ ...filters, education: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
            >
              <option value="">Any Education Level</option>
              {educationLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Interests</label>
            <div className="flex flex-wrap gap-2">
              {popularInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    const current = filters.interests;
                    if (current.includes(interest)) {
                      setFilters({
                        ...filters,
                        interests: current.filter(i => i !== interest)
                      });
                    } else {
                      setFilters({
                        ...filters,
                        interests: [...current, interest]
                      });
                    }
                  }}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    filters.interests.includes(interest)
                      ? 'bg-coral text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Additional Preferences</h3>
            
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Has Photos</span>
              <input
                type="checkbox"
                checked={filters.hasPhotos}
                onChange={(e) => setFilters({ ...filters, hasPhotos: e.target.checked })}
                className="w-5 h-5 text-coral rounded focus:ring-coral"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Verified Profiles Only</span>
              <input
                type="checkbox"
                checked={filters.isVerified}
                onChange={(e) => setFilters({ ...filters, isVerified: e.target.checked })}
                className="w-5 h-5 text-coral rounded focus:ring-coral"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Recently Active</span>
              <input
                type="checkbox"
                checked={filters.recentlyActive}
                onChange={(e) => setFilters({ ...filters, recentlyActive: e.target.checked })}
                className="w-5 h-5 text-coral rounded focus:ring-coral"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex space-x-3">
            <button
              onClick={resetFilters}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};