import React from 'react';
import { X } from 'lucide-react';
import { Comments } from './Comments';

interface CommentsModalProps {
  postId: string;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ postId, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <Comments postId={postId} />
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;


