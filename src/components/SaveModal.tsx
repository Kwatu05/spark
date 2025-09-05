import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';

interface SaveModalProps {
  postId: string;
  onClose: () => void;
}

type Board = { id: string; name: string; items: string[] };

const STORAGE_KEY = 'spark_boards';

function loadBoards(): Board[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveBoards(boards: Board[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}

export const SaveModal: React.FC<SaveModalProps> = ({ postId, onClose }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoard, setNewBoard] = useState('');

  useEffect(() => { setBoards(loadBoards()); }, []);

  const addBoard = () => {
    const name = newBoard.trim();
    if (!name) return;
    const b: Board = { id: String(Date.now()), name, items: [] };
    const next = [b, ...boards];
    setBoards(next);
    saveBoards(next);
    setNewBoard('');
  };

  const saveToBoard = (boardId: string) => {
    const next = boards.map(b => b.id === boardId ? { ...b, items: Array.from(new Set([postId, ...b.items])) } : b);
    setBoards(next);
    saveBoards(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Save to board</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="flex items-center space-x-2 mb-3">
          <input value={newBoard} onChange={e=>setNewBoard(e.target.value)} placeholder="New board name" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          <button onClick={addBoard} className="px-3 py-2 bg-coral text-white rounded-lg text-sm flex items-center space-x-1"><Plus size={14} /><span>Create</span></button>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-auto">
          {boards.length === 0 && <div className="text-sm text-gray-600">No boards yet. Create one above.</div>}
          {boards.map(b => (
            <button key={b.id} onClick={()=>saveToBoard(b.id)} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-gray-500">{b.items.length} saved</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SaveModal;


