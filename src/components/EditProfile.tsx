import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, MapPin, Briefcase, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface EditProfileProps {
  onBack: () => void;
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
}

export const EditProfile: React.FC<EditProfileProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    bio: '',
    location: '',
    profession: '',
    connectionPreference: 'Not sure',
    interests: [] as string[]
  });

  const [newInterest, setNewInterest] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ok: boolean; profile: UserProfile}>('/profile');
      if (response.ok) {
        setProfile(response.profile);
        setFormData({
          name: response.profile.name || '',
          age: response.profile.age || 25,
          bio: response.profile.bio || '',
          location: response.profile.location || '',
          profession: response.profile.profession || '',
          connectionPreference: response.profile.connectionPreference || 'Not sure',
          interests: response.profile.interests || []
        });
        // Initialize photos with avatar
        setPhotos([response.profile.avatar || '']);
      } else {
        setError('Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const connectionOptions = ['Long-term', 'Short-term', 'Friends', 'Casual', 'Not sure'];
  const suggestedInterests = [
    'Hiking', 'Photography', 'Coffee', 'Travel', 'Art', 'Yoga', 'Cooking', 'Wine', 
    'Food', 'Jazz', 'Cycling', 'Dancing', 'Music', 'Culture', 'Festivals', 
    'Rock Climbing', 'Technology', 'Sustainability', 'Fitness', 'Reading'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData({
        ...formData,
        interests: [...formData.interests, interest]
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(interest => interest !== interestToRemove)
    });
  };

  const addPhoto = () => {
    // In real app, this would open camera/gallery
    const newPhotoUrl = `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`;
    setPhotos([...photos, newPhotoUrl]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await api.put<{ok: boolean; error?: string; message?: string}>('/profile', {
        ...formData,
        avatar: photos[0] || '' // Use first photo as avatar
      });
      
      if (response.ok) {
        // Update local storage with new avatar if changed
        if (photos[0]) {
          localStorage.setItem('profile_avatar', photos[0]);
        }
        onBack();
      } else {
        setError(response.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-coral" />
            <span className="text-gray-600">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save</span>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Photos Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
          <div className="grid grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                {index > 0 && (
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                    Main
                  </div>
                )}
              </div>
            ))}
            
            {photos.length < 6 && (
              <button
                onClick={addPhoto}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-coral hover:bg-coral/5 transition-colors"
              >
                <Plus size={24} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Add Photo</span>
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Add up to 6 photos. Your first photo will be your main profile picture.
          </p>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                min="18"
                max="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About Me</h2>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={4}
            placeholder="Tell people about yourself, your passions, and what makes you unique..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors resize-none"
          />
          <p className="text-sm text-gray-500 mt-2">
            {formData.bio.length}/500 characters
          </p>
        </div>

        {/* Connection Preference */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Looking For</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {connectionOptions.map((option) => (
              <button
                key={option}
                onClick={() => setFormData({ ...formData, connectionPreference: option })}
                className={`p-3 rounded-xl border-2 font-medium transition-all duration-200 ${
                  formData.connectionPreference === option
                    ? 'border-coral bg-coral text-white'
                    : 'border-gray-200 text-gray-700 hover:border-coral hover:bg-coral/5'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interests</h2>
          
          {/* Add Interest */}
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addInterest(newInterest);
                }
              }}
              placeholder="Add an interest..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
            />
            <button
              onClick={() => addInterest(newInterest)}
              className="px-4 py-2 bg-coral text-white rounded-xl hover:bg-coral/90 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Current Interests */}
          {formData.interests.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Interests</h3>
              <div className="flex flex-wrap gap-2">
                {formData.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-coral text-white text-sm rounded-full flex items-center space-x-1"
                  >
                    <span>{interest}</span>
                    <button
                      onClick={() => removeInterest(interest)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Interests */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedInterests
                .filter(interest => !formData.interests.includes(interest))
                .slice(0, 12)
                .map((interest) => (
                  <button
                    key={interest}
                    onClick={() => addInterest(interest)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-coral hover:text-white transition-colors"
                  >
                    {interest}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Profile Tips */}
        <div className="bg-gradient-to-r from-coral/10 to-warm-pink/10 p-6 rounded-xl">
          <h3 className="font-semibold text-coral mb-3">💡 Profile Tips</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-coral">•</span>
              <span>Use high-quality photos that show your face clearly</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-coral">•</span>
              <span>Include photos of your hobbies and interests</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-coral">•</span>
              <span>Write an authentic bio that reflects your personality</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-coral">•</span>
              <span>Be specific about what you're looking for</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-coral">•</span>
              <span>Add interests that you're genuinely passionate about</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};