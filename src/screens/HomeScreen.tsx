import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '../context/TeamContext';
import { Plus, Users, Zap, ArrowRight, Database, RefreshCw } from 'lucide-react';
import CreateTeamModal from '../components/CreateTeamModal';
import TeamManagementModal from '../components/TeamManagementModal';

export default function HomeScreen() {
  const { teams, loadDummyData, clearMatchData, currentMatch, setCurrentMatch } = useTeams();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // Initialize with currentMatch if available
  const [homeTeamId, setHomeTeamId] = useState(currentMatch.homeTeamId || '');
  const [awayTeamId, setAwayTeamId] = useState(currentMatch.awayTeamId || '');

  // Update local state if context changes (e.g. after clearMatchData)
  useEffect(() => {
    setHomeTeamId(currentMatch.homeTeamId || '');
    setAwayTeamId(currentMatch.awayTeamId || '');
  }, [currentMatch]);

  const handleStartMatch = () => {
    if (!homeTeamId || !awayTeamId) {
      alert('請選擇主隊與客隊');
      return;
    }
    if (homeTeamId === awayTeamId) {
      alert('主隊與客隊不能相同');
      return;
    }
    
    // Lock the match teams
    setCurrentMatch(homeTeamId, awayTeamId);
    navigate(`/match-setup?home=${homeTeamId}&away=${awayTeamId}`);
  };
  
  const isMatchLocked = !!currentMatch.homeTeamId && !!currentMatch.awayTeamId;

  const handleClearMatch = () => {
    if (isMatchLocked) {
      if (window.confirm('確定要清空目前的所有比賽資料嗎？此動作無法復原。')) {
        clearMatchData();
      }
    } else {
      clearMatchData();
      // Also clear local selection state immediately
      setHomeTeamId('');
      setAwayTeamId('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 shadow-sm flex items-center justify-between relative z-50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VolleyTag</h1>
          <p className="text-xs text-gray-500">排球紀錄與陣容管理</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearMatch}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all active:scale-95"
            title="清空比賽資料"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">開新比賽</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4 space-y-6">
        
        {/* Quick Match Setup */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-indigo-100">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
              <Zap size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">快速對戰設定</h2>
            {isMatchLocked && (
              <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                比賽進行中 (資料已鎖定)
              </span>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">主隊 (Home)</label>
              <select
                className={`w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${isMatchLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                disabled={isMatchLocked}
              >
                <option value="" disabled>選擇球隊...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id} disabled={team.id === awayTeamId}>
                    {team.name} {team.isTemp ? '(測試)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex pb-3 text-gray-400 font-bold">VS</div>

            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">客隊 (Away)</label>
              <select
                className={`w-full rounded-lg border border-gray-300 px-3 py-2.5 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${isMatchLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                disabled={isMatchLocked}
              >
                <option value="" disabled>選擇球隊...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id} disabled={team.id === homeTeamId}>
                    {team.name} {team.isTemp ? '(測試)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              className={`w-full md:w-auto flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 font-medium text-white shadow-sm transition-all ${
                !homeTeamId || !awayTeamId
                  ? 'bg-gray-300 cursor-not-allowed'
                  : isMatchLocked 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 animate-pulse shadow-indigo-200'
              }`}
              onClick={handleStartMatch}
              disabled={!homeTeamId || !awayTeamId}
            >
              {isMatchLocked ? <ArrowRight size={18} /> : <Zap size={18} />}
              {isMatchLocked ? '繼續設定' : '開始紀錄'}
            </button>
          </div>
        </div>

        {/* Create Team Action */}
        <div className={`rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-md ${isMatchLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">建立新球隊</h2>
              <p className="text-blue-100 text-sm mt-1">
                建立球隊資料庫，輸入球員名單，開始管理您的比賽陣容。
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => {
                  const { homeId, awayId } = loadDummyData();
                  setHomeTeamId(homeId);
                  setAwayTeamId(awayId);
                }}
                className="flex items-center gap-2 rounded-lg bg-white/20 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-white/30 active:scale-95 transition-all backdrop-blur-sm"
              >
                <Database size={20} />
                測試資料
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-bold text-blue-600 shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
              >
                <Plus size={20} />
                建立球隊
              </button>
            </div>
          </div>
        </div>

        {/* Team List Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">球隊資料庫 ({teams.filter(t => !t.isTemp).length})</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.filter(t => !t.isTemp).length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center text-gray-500">
                <Users size={48} className="mb-4 opacity-50" />
                <p className="font-medium">尚無球隊資料</p>
                <p className="text-sm mt-2">請點擊上方「建立新球隊」</p>
              </div>
            ) : (
              teams.filter(t => !t.isTemp).map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md text-left w-full"
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900 truncate pr-2">{team.name}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${team.type === 'Home' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {team.type === 'Home' ? '主隊' : '客隊'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users size={14} />
                      <span>{team.players.length} 名球員</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 w-full">
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      管理球隊
                    </span>
                    <div className="rounded-full bg-gray-50 p-1.5 text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      <CreateTeamModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      <TeamManagementModal
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}
