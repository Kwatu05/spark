import React, { useEffect, useMemo, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Check, Lock, Globe } from 'lucide-react';

type CoupleBoardItem = {
  id: string;
  type: 'post' | 'note' | 'place' | 'media';
  content: string;
  addedBy: string; // userId
  addedAt: string; // ISO date
  metadata?: {
    url?: string;
    imageUrl?: string;
    location?: string;
    tags?: string[];
  };
};

type CoupleBoard = {
  id: string;
  name: string;
  description?: string;
  items: CoupleBoardItem[];
  visibility: 'private' | 'public';
  permissions: {
    canEdit: string[]; // userIds who can edit
    canView: string[]; // userIds who can view (empty = all couple members)
  };
  createdAt: string;
  createdBy: string;
};

type CoupleMember = {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
};

type CoupleBoardsState = {
  coupleId: string;
  members: CoupleMember[];
  boards: CoupleBoard[];
};

const COUPLE_BOARDS_KEY = 'couple_boards';

function loadCoupleBoards(): CoupleBoardsState {
  try {
    const raw = localStorage.getItem(COUPLE_BOARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.coupleId && Array.isArray(parsed.boards) && Array.isArray(parsed.members)) return parsed;
    }
  } catch {}
  // initialize with mock couple members
  const init = { 
    coupleId: crypto.randomUUID(), 
    members: [
      { id: 'user1', name: 'You', avatar: '', isOnline: true },
      { id: 'user2', name: 'Partner', avatar: '', isOnline: false }
    ],
    boards: [] 
  } as CoupleBoardsState;
  try { localStorage.setItem(COUPLE_BOARDS_KEY, JSON.stringify(init)); } catch {}
  return init;
}

function saveCoupleBoards(state: CoupleBoardsState) {
  try { localStorage.setItem(COUPLE_BOARDS_KEY, JSON.stringify(state)); } catch {}
}

export const CoupleBoards: React.FC = () => {
  const [state, setState] = useState<CoupleBoardsState>(() => loadCoupleBoards());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState<'private' | 'public'>('private');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemType, setNewItemType] = useState<'post' | 'note' | 'place' | 'media'>('note');

  useEffect(() => { saveCoupleBoards(state); }, [state]);

  const filteredBoards = useMemo(() => {
    if (filter === 'all') return state.boards;
    return state.boards.filter(b => b.visibility === filter);
  }, [state.boards, filter]);

  const createBoard = () => {
    if (!newName.trim()) return;
    const board: CoupleBoard = { 
      id: crypto.randomUUID(), 
      name: newName.trim(), 
      description: newDescription.trim(),
      items: [], 
      visibility: newVisibility,
      permissions: {
        canEdit: state.members.map(m => m.id), // All members can edit by default
        canView: [] // Empty means all couple members can view
      },
      createdAt: new Date().toISOString(),
      createdBy: 'user1' // Current user
    };
    setState(prev => ({ ...prev, boards: [board, ...prev.boards] }));
    setNewName('');
    setNewDescription('');
    setNewVisibility('private');
    setCreating(false);
  };

  const startRename = (id: string, current: string, currentDesc: string) => { 
    setEditingId(id); 
    setEditName(current); 
    setEditDescription(currentDesc || '');
  };
  
  const confirmRename = () => {
    if (!editingId) return;
    setState(prev => ({ 
      ...prev, 
      boards: prev.boards.map(b => 
        b.id === editingId 
          ? { ...b, name: editName.trim() || b.name, description: editDescription.trim() } 
          : b
      ) 
    }));
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };
  
  const deleteBoard = (id: string) => setState(prev => ({ ...prev, boards: prev.boards.filter(b => b.id !== id) }));

  const addItemToBoard = (boardId: string) => {
    if (!newItemContent.trim()) return;
    const item: CoupleBoardItem = {
      id: crypto.randomUUID(),
      type: newItemType,
      content: newItemContent.trim(),
      addedBy: 'user1', // Current user
      addedAt: new Date().toISOString(),
      metadata: {}
    };
    setState(prev => ({
      ...prev,
      boards: prev.boards.map(b => 
        b.id === boardId 
          ? { ...b, items: [item, ...b.items] }
          : b
      )
    }));
    setNewItemContent('');
    setNewItemType('note');
  };

  const removeItemFromBoard = (boardId: string, itemId: string) => {
    setState(prev => ({
      ...prev,
      boards: prev.boards.map(b => 
        b.id === boardId 
          ? { ...b, items: b.items.filter(i => i.id !== itemId) }
          : b
      )
    }));
  };

  const selectedBoardData = selectedBoard ? state.boards.find(b => b.id === selectedBoard) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center space-x-3 mb-4">
        <Users size={22} className="text-coral" />
        <h1 className="text-lg font-semibold">Shared Couple Boards</h1>
      </div>

      {/* Couple Members Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">Couple ID: <span className="font-mono">{state.coupleId}</span></div>
            <div className="flex items-center space-x-2">
              {state.members.map(member => (
                <div key={member.id} className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded-md">
                  <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            {!creating ? (
              <button onClick={() => setCreating(true)} className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-coral text-white rounded-md">
                <Plus size={16} />
                <span>New Board</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Board name" className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
                <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description (optional)" className="border border-gray-300 rounded-md px-2 py-1 text-sm" />
                <select value={newVisibility} onChange={e => setNewVisibility(e.target.value as any)} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
                <button onClick={createBoard} className="px-3 py-1 bg-coral text-white rounded-md text-sm">Create</button>
                <button onClick={() => { setCreating(false); setNewName(''); setNewDescription(''); setNewVisibility('private'); }} className="px-3 py-1 border border-gray-300 rounded-md text-sm">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedBoardData ? (
        // Board Detail View
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{selectedBoardData.name}</h2>
              {selectedBoardData.description && (
                <p className="text-gray-600 text-sm mt-1">{selectedBoardData.description}</p>
              )}
            </div>
            <button 
              onClick={() => setSelectedBoard(null)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Back to Boards
            </button>
          </div>

          {/* Add Item Form */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <select value={newItemType} onChange={e => setNewItemType(e.target.value as any)} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                <option value="note">Note</option>
                <option value="post">Post</option>
                <option value="place">Place</option>
                <option value="media">Media</option>
              </select>
              <input 
                value={newItemContent} 
                onChange={e => setNewItemContent(e.target.value)} 
                placeholder={`Add a ${newItemType}...`}
                className="flex-1 border border-gray-300 rounded-md px-3 py-1 text-sm"
                onKeyPress={e => e.key === 'Enter' && addItemToBoard(selectedBoardData.id)}
              />
              <button 
                onClick={() => addItemToBoard(selectedBoardData.id)}
                className="px-3 py-1 bg-coral text-white rounded-md text-sm hover:bg-coral/90"
              >
                Add
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {selectedBoardData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No items yet. Add something to get started!</div>
            ) : (
              selectedBoardData.items.map(item => {
                const addedByMember = state.members.find(m => m.id === item.addedBy);
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.type}</span>
                          <span className="text-xs text-gray-500">
                            Added by {addedByMember?.name} • {new Date(item.addedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-900">{item.content}</p>
                      </div>
                      <button 
                        onClick={() => removeItemFromBoard(selectedBoardData.id, item.id)}
                        className="p-1 hover:bg-gray-100 rounded text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // Boards Grid View
        <>
          {filteredBoards.length === 0 ? (
            <div className="text-center py-12 text-gray-600">No boards yet. Create one to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBoards.map(board => (
                <div key={board.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedBoard(board.id)}>
                  <div className="flex items-center justify-between mb-2">
                    {editingId === board.id ? (
                      <div className="flex items-center space-x-2 flex-1">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm flex-1" />
                        <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description" className="border border-gray-300 rounded px-2 py-1 text-sm flex-1" />
                        <button onClick={confirmRename} className="p-1 text-coral"><Check size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{board.name}</h3>
                        {board.description && (
                          <p className="text-sm text-gray-600 mt-1">{board.description}</p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                        {board.visibility === 'public' ? (<><Globe size={14} /> Public</>) : (<><Lock size={14} /> Private</>)}
                      </span>
                      <button onClick={() => startRename(board.id, board.name, board.description || '')} className="p-1 hover:bg-gray-100 rounded"><Pencil size={16} /></button>
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
        </>
      )}
    </div>
  );
};

export default CoupleBoards;


