import React, { useState, useEffect } from 'react';
import { X, Trash2, UserPlus, Save, Users, AlertTriangle } from 'lucide-react';
import { useTeams } from '../context/TeamContext';
import { Team, Position } from '../types';

interface TeamManagementModalProps {
  teamId: string | null;
  onClose: () => void;
}

export default function TeamManagementModal({ teamId, onClose }: TeamManagementModalProps) {
  const { teams, updateTeam, deleteTeam, addPlayerToTeam, removePlayerFromTeam } = useTeams();
  
  const team = teams.find(t => t.id === teamId);
  
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPos, setNewPlayerPos] = useState<Position>('Unknown');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempTeamName, setTempTeamName] = useState('');
  
  // Custom confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'team' | 'player', id?: string } | null>(null);

  useEffect(() => {
    if (team) {
      setTempTeamName(team.name);
    }
  }, [team]);

  if (!teamId || !team) return null;

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerNumber) return;
    
    if (team.players.some(p => p.number === newPlayerNumber)) {
      alert('背號已存在');
      return;
    }

    addPlayerToTeam(team.id, {
      number: newPlayerNumber,
      name: newPlayerName || `球員 ${newPlayerNumber}`,
      position: newPlayerPos
    });
    
    setNewPlayerNumber('');
    setNewPlayerName('');
    setNewPlayerPos('Unknown');
  };

  const handleSaveName = () => {
    if (tempTeamName.trim()) {
      updateTeam(team.id, { name: tempTeamName });
      setIsEditingName(false);
    }
  };

  const executeDelete = () => {
    if (confirmDelete?.type === 'team') {
      deleteTeam(team.id);
      onClose();
    } else if (confirmDelete?.type === 'player' && confirmDelete.id) {
      removePlayerFromTeam(team.id, confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl relative overflow-hidden">
        
        {/* Confirmation Overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm p-6">
            <div className="max-w-sm w-full bg-white rounded-xl shadow-xl border border-gray-200 p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmDelete.type === 'team' ? '刪除球隊' : '刪除球員'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {confirmDelete.type === 'team' 
                  ? `確定要刪除「${team.name}」嗎？此動作無法復原。` 
                  : '確定要刪除這位球員嗎？'}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={executeDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${team.type === 'Home' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">球隊管理</h2>
              <p className="text-xs text-gray-500">{team.type === 'Home' ? '主隊' : '客隊'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Team Info */}
          <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-4">
              <label className="block text-xs font-medium uppercase text-gray-500">球隊名稱</label>
              {isEditingName ? (
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={tempTeamName}
                    onChange={(e) => setTempTeamName(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveName}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    <Save size={18} />
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                  <button 
                    onClick={() => {
                      setTempTeamName(team.name);
                      setIsEditingName(true);
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    編輯名稱
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={team.type === 'Home'} 
                  onChange={() => updateTeam(team.id, { type: 'Home' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">主隊 (Home)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={team.type === 'Away'} 
                  onChange={() => updateTeam(team.id, { type: 'Away' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">客隊 (Away)</span>
              </label>
            </div>
          </div>

          {/* Add Player Form */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
              <UserPlus size={16} className="text-blue-600" />
              新增球員
            </h3>
            <form onSubmit={handleAddPlayer} className="flex flex-col gap-3 sm:flex-row">
              <div className="w-24">
                <input
                  type="text"
                  placeholder="背號"
                  value={newPlayerNumber}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) setNewPlayerNumber(e.target.value);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  inputMode="numeric"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="姓名"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="w-32">
                <select
                  value={newPlayerPos}
                  onChange={(e) => setNewPlayerPos(e.target.value as Position)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Unknown">位置</option>
                  <option value="OH">大砲 (OH)</option>
                  <option value="MB">攔中 (MB)</option>
                  <option value="OP">舉對 (OP)</option>
                  <option value="S">舉球 (S)</option>
                  <option value="L">自由 (L)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!newPlayerNumber}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                新增
              </button>
            </form>
          </div>

          {/* Player List */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">球員名單 ({team.players.length})</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <ul className="divide-y divide-gray-100">
                {team.players.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500 text-sm">
                    尚無球員
                  </li>
                ) : (
                  team.players.map((player) => (
                    <li key={player.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${player.position === 'L' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                          {player.number}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{player.name}</p>
                          <p className="text-xs text-gray-500">{player.position !== 'Unknown' ? player.position : '未指定'}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ type: 'player', id: player.id });
                        }}
                        className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="刪除球員"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => setConfirmDelete({ type: 'team' })}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
            刪除球隊
          </button>
          
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
