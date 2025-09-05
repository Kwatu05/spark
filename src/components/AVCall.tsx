import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Map, ListMusic, Film } from 'lucide-react';

export const AVCall: React.FC = () => {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mode, setMode] = useState<'map' | 'watchlist' | 'playlist'>('map');
  const selfVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Placeholder: in real app, attach WebRTC stream
    if (selfVideo.current) selfVideo.current.srcObject = null;
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
        <div className="bg-black rounded-xl border border-white/10 relative">
          <video ref={selfVideo} className="w-full h-full object-cover rounded-xl" autoPlay playsInline muted />
          <div className="absolute bottom-2 left-2 text-white text-xs px-2 py-1 bg-white/10 rounded">You</div>
        </div>
        <div ref={remoteVideo} className="bg-black rounded-xl border border-white/10 relative hidden md:block">
          <div className="absolute inset-0 flex items-center justify-center text-white/50">
            <div className="text-center">
              <div className="mb-2">Remote video</div>
              <button className="px-3 py-1.5 bg-white/20 text-white rounded-full text-sm">Invite partner</button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-t-2xl p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={() => setMode('map')} className={`px-3 py-1.5 rounded-full text-sm ${mode==='map'?'bg-coral text-white':'bg-gray-100'}`}><Map size={16} className="inline mr-1"/> Map</button>
            <button onClick={() => setMode('watchlist')} className={`px-3 py-1.5 rounded-full text-sm ${mode==='watchlist'?'bg-coral text-white':'bg-gray-100'}`}><Film size={16} className="inline mr-1"/> Watchlist</button>
            <button onClick={() => setMode('playlist')} className={`px-3 py-1.5 rounded-full text-sm ${mode==='playlist'?'bg-coral text-white':'bg-gray-100'}`}><ListMusic size={16} className="inline mr-1"/> Playlist</button>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setMicOn(!micOn)} className="p-2.5 bg-gray-100 rounded-full">{micOn ? <Mic size={18}/> : <MicOff size={18}/>}</button>
            <button onClick={() => setCamOn(!camOn)} className="p-2.5 bg-gray-100 rounded-full">{camOn ? <Video size={18}/> : <VideoOff size={18}/>}</button>
            <button onClick={() => history.back()} className="px-4 py-2 bg-red-500 text-white rounded-full font-semibold inline-flex items-center"><PhoneOff size={18} className="mr-2"/> End</button>
          </div>
        </div>
        <div className="mt-4">
          {mode === 'map' && (
            <div className="h-40 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">Date spots map coming soon</div>
          )}
          {mode === 'watchlist' && (
            <div className="h-40 bg-gray-100 rounded-xl p-4 text-sm text-gray-700">Shared watchlist: add movies/series to watch together.</div>
          )}
          {mode === 'playlist' && (
            <div className="h-40 bg-gray-100 rounded-xl p-4 text-sm text-gray-700">Shared playlist: add songs for your date vibe.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AVCall;


