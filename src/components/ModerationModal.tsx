import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';

export interface ModerationModalProps {
  targetId: string;
  kind: 'user' | 'post' | 'comment' | 'moment';
  onClose: () => void;
  onSubmit?: (reason: string, details: string) => void;
}

const REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Fake account', 'Other'];

export const ModerationModal: React.FC<ModerationModalProps> = ({ targetId, kind, onClose, onSubmit }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const submit = () => {
    onSubmit?.(reason, details);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Flag size={20} className="text-red-500" />
            <h2 className="text-lg font-semibold">Report {kind}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {REASONS.map(r => (<option key={r} value={r}>{r}</option>))}
          </select>
          <label className="block text-sm font-medium text-gray-700">Details (optional)</label>
          <textarea value={details} onChange={(e)=>setDetails(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Provide more context" />
        </div>
        <button onClick={submit} className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg font-semibold">Submit Report</button>
        <p className="text-xs text-gray-500 mt-2">Report #{targetId.slice(-6)}</p>
      </div>
    </div>
  );
};

export default ModerationModal;


