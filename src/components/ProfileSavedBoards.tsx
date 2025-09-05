import React, { useEffect, useState } from 'react';
import { Bookmark, Plus, Pencil, Trash2, Check } from 'lucide-react';

type Board = {
  id: string;
  name: string;
  items: string[]; // store post ids for now
};

const SAVED_BOARDS_KEY = 'saved_boards';

function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(SAVED_BOARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function saveBoards(boards: Board[]) {
  try { localStorage.setItem(SAVED_BOARDS_KEY, JSON.stringify(boards)); } catch {}
}

export const ProfileSavedBoards: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>(() => loadBoards());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { saveBoards(boards); }, [boards]);

  const createBoard = () => {
    if (!newName.trim()) return;
    const board: Board = { id: crypto.randomUUID(), name: newName.trim(), items: [] };
    setBoards(prev => [board, ...prev]);
    setNewName('');
    setCreating(false);
  };

  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setEditName(current);
  };

  const confirmRename = () => {
    if (!editingId) return;
    setBoards(prev => prev.map(b => b.id === editingId ? { ...b, name: editName.trim() || b.name } : b));
    setEditingId(null);
    setEditName('');
  };

  const deleteBoard = (id: string) => {
    setBoards(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Saved Boards</h2>
        {!creating ? (
          <button onClick={() => setCreating(true)} className="flex items-center space-x-2 px-3 py-2 text-sm bg-coral text-white rounded-md">
            <Plus size={16} />
            <span>New Board</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Board name" className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
            <button onClick={createBoard} className="px-3 py-1 bg-coral text-white rounded-md text-sm">Create</button>
            <button onClick={() => { setCreating(false); setNewName(''); }} className="px-3 py-1 border border-gray-300 rounded-md text-sm">Cancel</button>
          </div>
        )}
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved boards yet</h3>
          <p className="text-gray-600">Create boards to organize saved posts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <div key={board.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                {editingId === board.id ? (
                  <div className="flex items-center space-x-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <button onClick={confirmRename} className="p-1 text-coral"><Check size={16} /></button>
                  </div>
                ) : (
                  <h3 className="font-medium text-gray-900">{board.name}</h3>
                )}
                <div className="flex items-center space-x-2">
                  <button onClick={() => startRename(board.id, board.name)} className="p-1 hover:bg-gray-100 rounded"><Pencil size={16} /></button>
                  <button onClick={() => deleteBoard(board.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center text-gray-500 text-sm">
                {board.items.length === 0 ? 'No items yet' : `${board.items.length} items`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileSavedBoards;


