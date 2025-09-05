import React, { useEffect, useState } from 'react';
import { Heart, Calendar, MapPin, Gift, Star, Plus, Edit3, Trash2, X } from 'lucide-react';

type MilestoneType = 'anniversary' | 'first_meet' | 'first_kiss' | 'first_date' | 'vacation' | 'holiday' | 'achievement' | 'custom';

type Milestone = {
  id: string;
  type: MilestoneType;
  title: string;
  description?: string;
  date: string; // ISO date
  location?: string;
  photos: string[];
  isPrivate: boolean;
  createdBy: string; // userId
  createdAt: string;
  tags: string[];
};

type CoupleMilestonesState = {
  coupleId: string;
  milestones: Milestone[];
};

const MILESTONES_KEY = 'couple_milestones';

function loadMilestones(): CoupleMilestonesState {
  try {
    const raw = localStorage.getItem(MILESTONES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.coupleId && Array.isArray(parsed.milestones)) return parsed;
    }
  } catch {}
  // initialize with sample milestones
  const init = {
    coupleId: crypto.randomUUID(),
    milestones: [
      {
        id: crypto.randomUUID(),
        type: 'first_meet' as MilestoneType,
        title: 'First Met',
        description: 'We met at the coffee shop downtown',
        date: '2023-06-15',
        location: 'Downtown Coffee Co.',
        photos: ['https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400'],
        isPrivate: false,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        tags: ['first', 'coffee', 'downtown']
      },
      {
        id: crypto.randomUUID(),
        type: 'anniversary' as MilestoneType,
        title: '1 Year Together',
        description: 'Celebrated our first anniversary with a romantic dinner',
        date: '2024-06-15',
        location: 'The Rooftop Restaurant',
        photos: ['https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400'],
        isPrivate: false,
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        tags: ['anniversary', 'dinner', 'celebration']
      }
    ]
  } as CoupleMilestonesState;
  try { localStorage.setItem(MILESTONES_KEY, JSON.stringify(init)); } catch {}
  return init;
}

function saveMilestones(state: CoupleMilestonesState) {
  try { localStorage.setItem(MILESTONES_KEY, JSON.stringify(state)); } catch {}
}

const milestoneIcons = {
  anniversary: Heart,
  first_meet: Star,
  first_kiss: Heart,
  first_date: Calendar,
  vacation: MapPin,
  holiday: Gift,
  achievement: Star,
  custom: Star
};

const milestoneColors = {
  anniversary: 'bg-pink-100 text-pink-700',
  first_meet: 'bg-blue-100 text-blue-700',
  first_kiss: 'bg-red-100 text-red-700',
  first_date: 'bg-green-100 text-green-700',
  vacation: 'bg-purple-100 text-purple-700',
  holiday: 'bg-yellow-100 text-yellow-700',
  achievement: 'bg-orange-100 text-orange-700',
  custom: 'bg-gray-100 text-gray-700'
};

export const CoupleMilestones: React.FC = () => {
  const [state, setState] = useState<CoupleMilestonesState>(() => loadMilestones());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'created'>('date');

  // Form state
  const [formData, setFormData] = useState({
    type: 'anniversary' as MilestoneType,
    title: '',
    description: '',
    date: '',
    location: '',
    isPrivate: false,
    tags: ''
  });

  useEffect(() => { saveMilestones(state); }, [state]);

  const filteredMilestones = state.milestones
    .filter(m => filter === 'all' || (filter === 'public' && !m.isPrivate) || (filter === 'private' && m.isPrivate))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const addMilestone = () => {
    if (!formData.title.trim() || !formData.date) return;
    
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      type: formData.type,
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: formData.date,
      location: formData.location.trim(),
      photos: [],
      isPrivate: formData.isPrivate,
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
    };

    setState(prev => ({ ...prev, milestones: [milestone, ...prev.milestones] }));
    setFormData({
      type: 'anniversary',
      title: '',
      description: '',
      date: '',
      location: '',
      isPrivate: false,
      tags: ''
    });
    setShowAddForm(false);
  };

  const editMilestone = (id: string) => {
    const milestone = state.milestones.find(m => m.id === id);
    if (!milestone) return;
    
    setFormData({
      type: milestone.type,
      title: milestone.title,
      description: milestone.description || '',
      date: milestone.date,
      location: milestone.location || '',
      isPrivate: milestone.isPrivate,
      tags: milestone.tags.join(', ')
    });
    setEditingId(id);
    setShowAddForm(true);
  };

  const updateMilestone = () => {
    if (!editingId || !formData.title.trim() || !formData.date) return;
    
    setState(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === editingId 
          ? {
              ...m,
              type: formData.type,
              title: formData.title.trim(),
              description: formData.description.trim(),
              date: formData.date,
              location: formData.location.trim(),
              isPrivate: formData.isPrivate,
              tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
            }
          : m
      )
    }));
    
    setFormData({
      type: 'anniversary',
      title: '',
      description: '',
      date: '',
      location: '',
      isPrivate: false,
      tags: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const deleteMilestone = (id: string) => {
    setState(prev => ({ ...prev, milestones: prev.milestones.filter(m => m.id !== id) }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Heart size={24} className="text-coral" />
          <h1 className="text-2xl font-semibold">Our Milestones</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
        >
          <Plus size={20} />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Milestones</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="created">Sort by Created</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            {filteredMilestones.length} milestone{filteredMilestones.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingId ? 'Edit Milestone' : 'Add New Milestone'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({
                  type: 'anniversary',
                  title: '',
                  description: '',
                  date: '',
                  location: '',
                  isPrivate: false,
                  tags: ''
                });
              }}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as MilestoneType }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="anniversary">Anniversary</option>
                <option value="first_meet">First Meet</option>
                <option value="first_kiss">First Kiss</option>
                <option value="first_date">First Date</option>
                <option value="vacation">Vacation</option>
                <option value="holiday">Holiday</option>
                <option value="achievement">Achievement</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Our First Anniversary"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tell the story of this milestone..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Central Park, NYC"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., romantic, dinner, celebration"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={e => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Keep this milestone private</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({
                  type: 'anniversary',
                  title: '',
                  description: '',
                  date: '',
                  location: '',
                  isPrivate: false,
                  tags: ''
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? updateMilestone : addMilestone}
              className="px-4 py-2 bg-coral text-white rounded-md text-sm hover:bg-coral/90"
            >
              {editingId ? 'Update' : 'Add'} Milestone
            </button>
          </div>
        </div>
      )}

      {/* Milestones Timeline */}
      <div className="space-y-6">
        {filteredMilestones.length === 0 ? (
          <div className="text-center py-12">
            <Heart size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No milestones yet</h3>
            <p className="text-gray-600">Start documenting your journey together by adding your first milestone!</p>
          </div>
        ) : (
          filteredMilestones.map((milestone) => {
            const Icon = milestoneIcons[milestone.type];
            const colorClass = milestoneColors[milestone.type];
            
            return (
              <div key={milestone.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-3 rounded-full ${colorClass}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${colorClass}`}>
                          {milestone.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {milestone.isPrivate && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            Private
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar size={16} />
                          <span>{formatDate(milestone.date)}</span>
                        </div>
                        {milestone.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin size={16} />
                            <span>{milestone.location}</span>
                          </div>
                        )}
                        <span>{getTimeAgo(milestone.date)}</span>
                      </div>

                      {milestone.description && (
                        <p className="text-gray-700 mb-4">{milestone.description}</p>
                      )}

                      {milestone.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {milestone.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {milestone.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {milestone.photos.map((photo, photoIndex) => (
                            <img
                              key={photoIndex}
                              src={photo}
                              alt={`${milestone.title} photo ${photoIndex + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => editMilestone(milestone.id)}
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => deleteMilestone(milestone.id)}
                      className="p-2 hover:bg-gray-100 rounded-full text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CoupleMilestones;
