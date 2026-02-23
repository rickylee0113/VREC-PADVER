import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useTeams } from '../context/TeamContext';
import { Position } from '../types';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const { createTeam } = useTeams();
  const [teamName, setTeamName] = useState('');
  
  // Fixed 12 slots as requested
  const [players, setPlayers] = useState(
    Array.from({ length: 12 }).map(() => ({
      number: '',
      name: ''
    }))
  );

  if (!isOpen) return null;

  const handleNumberChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newPlayers = [...players];
    newPlayers[index].number = value;
    setPlayers(newPlayers);
  };

  const handleNameChange = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = value;
    setPlayers(newPlayers);
  };

  const handleSave = () => {
    if (!teamName.trim()) {
      alert('請輸入球隊名稱');
      return;
    }

    const validPlayers = players.filter(p => p.number.trim() !== '');
    
    // Validation: Check minimum count but allow saving with warning
    if (validPlayers.length < 6) {
      const confirmSave = window.confirm(`目前只有 ${validPlayers.length} 位有效球員。\n排球比賽通常需要至少 6 位球員。\n\n確定要儲存嗎？`);
      if (!confirmSave) return;
    }

    // Check duplicates
    const numbers = validPlayers.map(p => p.number);
    const hasDuplicates = new Set(numbers).size !== numbers.length;
    if (hasDuplicates) {
      alert('球員背號不能重複');
      return;
    }

    try {
      createTeam(
        teamName,
        'Home',
        validPlayers.map(p => ({
          number: p.number,
          name: p.name || `球員 ${p.number}`,
          position: 'Unknown' as Position
        }))
      );
      
      // Reset and close
      setTeamName('');
      setPlayers(Array.from({ length: 12 }).map(() => ({ number: '', name: '' })));
      onClose();
    } catch (error) {
      console.error("Save failed", error);
      alert("儲存失敗，請稍後再試");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">建立新球隊</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              球隊名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="例如：台電女排"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">球員名單 (最多12人)</label>
            <span className={`text-xs font-medium px-2 py-1 rounded ${players.filter(p => p.number).length >= 7 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              目前有效: {players.filter(p => p.number).length} (最少 7)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-300 hover:bg-white">
                <span className="w-6 text-center text-xs font-bold text-gray-400">{index + 1}</span>
                <input
                  type="text"
                  value={player.number}
                  onChange={(e) => handleNumberChange(index, e.target.value)}
                  placeholder="#"
                  className="w-12 rounded border border-gray-300 px-1 py-1.5 text-center font-mono text-sm font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  inputMode="numeric"
                />
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  placeholder="姓名"
                  className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>
              請輸入球員背號 (必填) 與姓名。
              <br />
              不需要填滿所有 12 個位置，但建議至少輸入 7 位球員以利比賽進行。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 active:scale-95"
          >
            <Save size={18} />
            儲存球隊
          </button>
        </div>
      </div>
    </div>
  );
}
