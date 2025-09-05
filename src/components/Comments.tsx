import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface CommentsProps {
  postId: string;
}

export const Comments: React.FC<CommentsProps> = ({ postId }) => {
  const [comments, setComments] = useState<{ id: string; text: string }[]>([]);
  const [text, setText] = useState('');
  const BAD = ['idiot', 'stupid', 'hate'];

  useEffect(() => {
    api.get<{ ok: boolean; comments: { id: string; text: string }[] }>(`/posts/${postId}/comments`).then((d) => {
      if (d?.ok) setComments(d.comments);
    }).catch(() => {});
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    if (BAD.some(b => lower.includes(b))) {
      alert('Your comment seems to contain inappropriate language. Please revise.');
      return;
    }
    const optimistic = { id: `tmp-${Date.now()}`, text };
    setComments((c) => [optimistic, ...c]);
    setText('');
    try {
      const d = await api.post<{ ok: boolean; comment: { id: string; text: string } }>(`/posts/${postId}/comments`, { text: optimistic.text });
      if (d?.ok) {
        setComments((c) => [d.comment, ...c.filter(x => x.id !== optimistic.id)]);
      }
    } catch {
      // rollback
      setComments((c) => c.filter(x => x.id !== optimistic.id));
      setText(optimistic.text);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-2 overflow-auto pr-1">
        {comments.length === 0 && (
          <div className="text-sm text-gray-500">No comments yet. Be the first to comment.</div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="text-sm text-gray-700">
            {c.text}
          </div>
        ))}
      </div>
      <div className="pt-2 sticky bottom-0 bg-white">
        <div className="flex items-center space-x-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment"
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
          />
          <button onClick={submit} className="px-3 py-2 bg-coral text-white rounded-lg text-sm">Post</button>
        </div>
      </div>
    </div>
  );
};

export default Comments;


