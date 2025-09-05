import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Heart, Image, Smile, MoreVertical, Mic, ThumbsUp, BarChart2 } from 'lucide-react';
import { User } from '../App';

interface ChatModalProps {
  user: User | null;
  onClose: () => void;
}

interface Message {
  id: string;
  text?: string;
  mediaUrl?: string;
  sender: 'me' | 'them';
  timestamp: string;
  type: 'text' | 'spark_notification' | 'audio' | 'gif';
}

export const ChatModal: React.FC<ChatModalProps> = ({ user, onClose }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `You both sparked each other's post "Perfect morning hike" 🔥`,
      sender: 'them',
      timestamp: '2 hours ago',
      type: 'spark_notification'
    },
    {
      id: '2',
      text: 'Hey! I saw your hiking post - that trail looks amazing! I love exploring new hiking spots.',
      sender: 'them',
      timestamp: '2 hours ago',
      type: 'text'
    },
    {
      id: '3',
      text: 'Hi! Thank you! It was such a beautiful morning. The view from the top was incredible 😍',
      sender: 'me',
      timestamp: '1 hour ago',
      type: 'text'
    },
    {
      id: '4',
      text: 'I can imagine! Do you have any other favorite trails in the area? I\'m always looking for new places to explore.',
      sender: 'them',
      timestamp: '45 minutes ago',
      type: 'text'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [privacy, setPrivacy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_privacy_settings') || '{}'); } catch { return {}; }
  });
  React.useEffect(() => {
    try { setPrivacy(JSON.parse(localStorage.getItem('app_privacy_settings') || '{}')); } catch {}
  }, []);
  const typingTimeoutRef = React.useRef<number | null>(null);

  // Voice notes
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const newMessage: Message = {
          id: Date.now().toString(),
          mediaUrl: url,
          sender: 'me',
          timestamp: 'now',
          type: 'audio'
        };
        setMessages(prev => [...prev, newMessage]);
      };
      mr.start();
      setIsRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    try { mediaRecorderRef.current?.stop(); } catch {}
    setIsRecording(false);
  };

  // GIF picker
  const [showGifPicker, setShowGifPicker] = useState(false);
  const gifOptions = [
    'https://media.giphy.com/media/3o6gbbuLW76jkt8vIc/giphy.gif',
    'https://media.giphy.com/media/l0HlPjezGY1z6nZ7m/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif'
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message,
        sender: 'me',
        timestamp: 'now',
        type: 'text'
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      // Simulate delivery/seen statuses
      window.setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, timestamp: 'delivered' } : m));
      }, 500);
      window.setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, timestamp: 'seen' } : m));
      }, 1200);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onTyping = (val: string) => {
    setMessage(val);
    setIsTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 1200);
  };

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
      setAtBottom(nearBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  if (!user) {
    // Show general chat list
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Chats</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Sample connections */}
              {[
                { name: 'Emma Thompson', lastMessage: 'Do you have any other favorite trails...', time: '45m', unread: 1 },
                { name: 'James Wilson', lastMessage: 'That cooking video was hilarious! 😂', time: '2h', unread: 0 },
                { name: 'Sofia Rodriguez', lastMessage: 'Thanks for the restaurant recommendation!', time: '1d', unread: 0 },
              ].map((chat, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <div className="relative">
                    <img
                      src={`https://images.pexels.com/photos/${3777931 + index}/pexels-photo-${3777931 + index}.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop`}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {chat.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-coral text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                      <span className="text-xs text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-coral/10 to-warm-pink/10 p-3 rounded-xl">
              <p className="text-sm text-gray-700">
                💡 <strong>Pro tip:</strong> You can only message people after you've both sparked each other's content!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-sm text-gray-500">
                {isTyping ? 'Typing…' : (!privacy?.privacy || privacy.privacy.showOnline !== false) ? 'Online now' : 'Last seen recently'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MoreVertical size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            if (msg.type === 'spark_notification') {
              return (
                <div key={msg.id} className="bg-gradient-to-r from-coral/10 to-warm-pink/10 p-3 rounded-xl text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <Heart size={16} className="text-coral" />
                    <span className="text-sm font-medium text-coral">Connection Made!</span>
                    <Heart size={16} className="text-coral" />
                  </div>
                  <p className="text-sm text-gray-700">{msg.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{msg.timestamp}</p>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                  msg.sender === 'me'
                    ? 'bg-coral text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {msg.type === 'text' && <p className="text-sm">{msg.text}</p>}
                  {msg.type === 'audio' && msg.mediaUrl && (
                    <audio controls src={msg.mediaUrl} className="w-48" />
                  )}
                  {msg.type === 'gif' && msg.mediaUrl && (
                    <img src={msg.mediaUrl} alt="gif" className="w-48 rounded" />
                  )}
                  <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-500'}`}>
                    {msg.sender === 'me' && (msg.timestamp === 'seen' || msg.timestamp === 'delivered') ? msg.timestamp : msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}
          {atBottom && (
            <div className="text-center text-xs text-gray-400">Seen</div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <button
              className={`p-2 ${isRecording ? 'text-red-600' : 'text-gray-600'} hover:text-coral hover:bg-gray-100 rounded-full transition-colors`}
              title="Voice note"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
            >
              <Mic size={18} />
            </button>
            <button className="p-2 text-gray-600 hover:text-coral hover:bg-gray-100 rounded-full transition-colors" title="Photo/Video">
              <Image size={18} />
            </button>
            <button className="p-2 text-gray-600 hover:text-coral hover:bg-gray-100 rounded-full transition-colors" title="Reactions">
              <Smile size={18} />
            </button>
            <button className="p-2 text-gray-600 hover:text-coral hover:bg-gray-100 rounded-full transition-colors" title="Quick Like">
              <ThumbsUp size={18} />
            </button>
            <button className="p-2 text-gray-600 hover:text-coral hover:bg-gray-100 rounded-full transition-colors" title="GIFs" onClick={()=>setShowGifPicker(true)}>
              <BarChart2 size={18} />
            </button>
          </div>
          {(privacy?.privacy?.messageMode === 'connections') && (
            <div className="mb-2 text-xs text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
              Only connections can send messages. Message may be queued as a request.
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-coral hover:bg-gray-100 rounded-full transition-colors">
              <Image size={20} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => onTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-coral/20"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-coral rounded-full transition-colors">
                <Smile size={16} />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className={`p-2 rounded-full transition-colors ${
                message.trim()
                  ? 'bg-coral text-white hover:bg-coral/90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
        {showGifPicker && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-4 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Choose a GIF</div>
                <button onClick={()=>setShowGifPicker(false)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {gifOptions.map((url) => (
                  <button key={url} onClick={()=>{ setMessages(prev=>[...prev,{ id: Date.now().toString(), mediaUrl: url, sender: 'me', timestamp: 'now', type: 'gif' }]); setShowGifPicker(false);} }>
                    <img src={url} alt="gif" className="w-full h-20 object-cover rounded" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};