import React, { useState } from 'react';
import { X, Camera, MapPin, Hash, Mic, Layers } from 'lucide-react';
import { api } from '../lib/api';

interface CreatePostProps {
  onBack: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ onBack }) => {
  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'carousel'>('photo');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [activityTags, setActivityTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [postType, setPostType] = useState<'post' | 'moment'>('post');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [coAuthorId, setCoAuthorId] = useState<string>('');
  const [drafts, setDrafts] = useState<Array<any>>(() => {
    try { return JSON.parse(localStorage.getItem('draft_posts') || '[]'); } catch { return []; }
  });

  const suggestedTags = [
    'RockClimbing', 'WineTasting', 'ComedyShows', 'Hiking', 'Cooking', 'Photography',
    'Museums', 'LiveMusic', 'Yoga', 'Beach', 'Coffee', 'Dancing'
  ];

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const formData = new FormData();
      files.slice(0, 10).forEach(file => {
        formData.append('images', file);
      });

      const response = await api.post<{ok: boolean; files?: Array<{url: string; filename: string}>; error?: string}>('/upload/images', formData);

      if (response.ok && response.files) {
        const uploadedUrls = response.files.map(file => file.url);
        const merged = [...selectedMedia, ...uploadedUrls].slice(0, 10);
        setSelectedMedia(merged);
        setMediaType(merged.length > 1 ? 'carousel' : (files[0].type.startsWith('video') ? 'video' : 'photo'));
      } else {
        console.error('Upload failed:', response.error);
        alert('Failed to upload images. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload images. Please try again.');
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setAudioUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addActivityTag = (tag: string) => {
    if (tag && !activityTags.includes(tag)) {
      setActivityTags([...activityTags, tag]);
      setCurrentTag('');
    }
  };

  const removeActivityTag = (tagToRemove: string) => {
    setActivityTags(activityTags.filter(tag => tag !== tagToRemove));
  };

  const handlePost = async () => {
    try {
      if (postType === 'post') {
        const response = await api.post<{ok: boolean; post?: any; error?: string}>('/posts', { 
          caption, 
          type: mediaType,
          content: selectedMedia,
          imageUrl: selectedMedia[0],
          videoUrl: mediaType==='video'? selectedMedia[0] : undefined,
          audioUrl: audioUrl || undefined,
          location, 
          activityTags 
        });
        
        if (response.ok) {
          // Post created successfully
          onBack();
        } else {
          console.error('Failed to create post:', response.error);
          // Still go back but could show error message
          onBack();
        }
      } else {
        await api.post('/moments', { videoUrl: selectedMedia[0] || '', coAuthorId: coAuthorId || undefined });
        onBack();
      }
    } catch (e) {
      console.error('Error creating post:', e);
      onBack();
    }
  };

  const saveDraft = () => {
    const draft = {
      id: String(Date.now()),
      postType,
      caption,
      imageUrl: selectedMedia[0] || null,
      location,
      activityTags,
      scheduledAt: scheduledAt || null,
      savedAt: new Date().toISOString(),
    };
    const next = [draft, ...drafts].slice(0, 50);
    setDrafts(next);
    try { localStorage.setItem('draft_posts', JSON.stringify(next)); } catch {}
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((d: any) => d.id !== id);
    setDrafts(next);
    try { localStorage.setItem('draft_posts', JSON.stringify(next)); } catch {}
  };

  const loadDraft = (d: any) => {
    setPostType(d.postType);
    setCaption(d.caption || '');
    setScheduledAt(d.scheduledAt || '');
    setSelectedMedia(d.imageUrl ? [d.imageUrl] : []);
    setLocation(d.location || '');
    setActivityTags(Array.isArray(d.activityTags) ? d.activityTags : []);
  };

  const publishDraft = async (d: any) => {
    try {
      if (d.postType === 'post') {
        await api.post('/posts', { caption: d.caption, imageUrl: d.imageUrl, location: d.location, activityTags: d.activityTags });
      } else {
        await api.post('/moments', { videoUrl: d.imageUrl || '' });
      }
      deleteDraft(d.id);
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
        <div className="relative bg-gray-100 rounded-full p-1 w-40 select-none">
          <div
            className={`absolute top-1/2 -translate-y-1/2 left-1 h-7 w-1/2 rounded-full bg-white shadow transition-transform duration-300 ease-out ${
              postType === 'post' ? 'translate-x-0' : 'translate-x-full'
            }`}
          />
          <div className="grid grid-cols-2">
            <button
              onClick={() => setPostType('post')}
              className={`relative z-10 px-3 py-1.5 text-sm font-medium transition-colors ${
                postType === 'post' ? 'text-coral' : 'text-gray-700'
              }`}
            >
              Post
            </button>
            <button
              onClick={() => setPostType('moment')}
              className={`relative z-10 px-3 py-1.5 text-sm font-medium transition-colors ${
                postType === 'moment' ? 'text-coral' : 'text-gray-700'
              }`}
            >
              Moment
            </button>
          </div>
        </div>
        <button
          onClick={handlePost}
          disabled={selectedMedia.length===0 || (postType==='post' && !caption)}
          className={`px-4 py-2 rounded-full font-semibold transition-colors ${
            selectedMedia.length>0 && (postType==='moment' || caption)
              ? 'bg-coral text-white hover:bg-coral/90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {postType==='post' ? 'Share Post' : 'Share Moment'}
        </button>
      </div>

      {/* Draft & Schedule Controls */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <button onClick={saveDraft} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Save as Draft</button>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
            <input type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)} className="text-sm bg-transparent outline-none" />
            <button onClick={saveDraft} className="px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200">Schedule</button>
          </div>
        </div>
        {postType==='moment' && (
          <div className="flex items-center gap-2">
            <input value={coAuthorId} onChange={(e)=>setCoAuthorId(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5" placeholder="Co-author user ID (optional)" />
          </div>
        )}
      </div>

      {/* Media Upload */}
      <div className="mb-6">
        {selectedMedia.length > 0 ? (
          <div className="relative">
            {mediaType === 'video' ? (
              <video src={selectedMedia[0]} className="w-full aspect-square object-cover rounded-xl" controls preload="metadata" />
            ) : (
              <div className={`grid gap-2 ${selectedMedia.length>1 ? 'grid-cols-2' : ''}`}>
                {selectedMedia.map((m, idx) => (
                  <img key={idx} src={m} alt={`Selected ${idx+1}`} className="w-full aspect-square object-cover rounded-xl" />
                ))}
              </div>
            )}
            <button
              onClick={() => setSelectedMedia([])}
              className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="flex space-x-4 mb-4">
                <label className="cursor-pointer p-4 bg-coral text-white rounded-full hover:bg-coral/90 transition-colors">
                  <Layers size={24} />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>
                <button className="p-4 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors">
                  <Camera size={24} />
                </button>
              </div>
              <p className="text-gray-600 font-medium">Add photos or a video (max 10 items)</p>
              <p className="text-sm text-gray-500">Share what makes you unique</p>
            </div>
          </div>
        )}
      </div>

      {/* Voice Caption */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2">
            <Mic size={16} />
            {audioUrl ? 'Replace voice caption' : 'Add voice caption'}
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>
          {audioUrl && <audio src={audioUrl} controls className="flex-1" />}
        </div>
      </div>

      {/* Caption (not required for moment) */}
      <div className="mb-6">
        <div className="flex items-start space-x-3">
          <img
            src="https://images.pexels.com/photos/3778876/pexels-photo-3778876.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop"
            alt="Your avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={postType==='post' ? "What's your story?" : "(Optional) Add a caption"}
            className="flex-1 p-3 border border-gray-200 rounded-xl resize-none h-24 focus:ring-2 focus:ring-coral/20 focus:border-coral transition-colors"
          />
        </div>
      </div>

      {/* Location */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl">
          <MapPin size={20} className="text-gray-500" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location"
            className="flex-1 outline-none"
          />
        </div>
      </div>

      {/* Activity Tags */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-xl mb-3">
          <Hash size={20} className="text-gray-500" />
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addActivityTag(currentTag);
              }
            }}
            placeholder="Add activity tags (e.g., RockClimbing, WineTasting)"
            className="flex-1 outline-none"
          />
        </div>

        {/* Selected Tags */}
        {activityTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activityTags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-coral text-white text-sm rounded-full flex items-center space-x-1"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => removeActivityTag(tag)}
                  className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Suggested Tags */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Suggested activity tags:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags
              .filter(tag => !activityTags.includes(tag))
              .slice(0, 8)
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => addActivityTag(tag)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-coral hover:text-white transition-colors"
                >
                  #{tag}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-coral/10 to-warm-pink/10 p-4 rounded-xl">
        <h3 className="font-semibold text-coral mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Showcase your personality and hobbies</li>
          <li>• Use activity tags to connect with similar interests</li>
          <li>• Add your location to meet people nearby</li>
          <li>• Be authentic - genuine moments spark connections</li>
        </ul>
      </div>

      {/* Drafts List */}
      {drafts.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Drafts & Scheduled</h3>
          <div className="space-y-2">
            {drafts.map((d:any) => (
              <div key={d.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-xs px-2 py-1 rounded-full bg-gray-100">{d.postType}</div>
                  <div className="text-sm text-gray-800 line-clamp-1 max-w-xs">{d.caption || '(no caption)'}</div>
                  {d.scheduledAt && (
                    <div className="text-xs text-gray-500">Scheduled: {new Date(d.scheduledAt).toLocaleString()}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>loadDraft(d)} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">Edit</button>
                  <button onClick={()=>publishDraft(d)} className="px-2 py-1 text-sm bg-coral text-white rounded hover:bg-coral/90">Publish</button>
                  <button onClick={()=>deleteDraft(d.id)} className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};