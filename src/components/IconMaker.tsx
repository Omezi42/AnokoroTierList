import React, { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { fetchCardNames, getImagePath } from '../lib/cards';
import { DeckIcon } from './DeckIcon';
import { motion } from 'framer-motion';

interface IconMakerProps {
  onAdd: (deck: { bgCard: string, subCard: string }) => void;
  onClose: () => void;
}

export const IconMaker: React.FC<IconMakerProps> = ({ onAdd, onClose }) => {
  const [cardNames, setCardNames] = useState<string[]>([]);
  const [bgSearch, setBgSearch] = useState('');
  const [subSearch, setSubSearch] = useState('');
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  useEffect(() => {
    fetchCardNames().then(setCardNames);
  }, []);

  const filteredBg = cardNames.filter(name => 
    name.toLowerCase().includes(bgSearch.toLowerCase())
  ).slice(0, 20);

  const filteredSub = cardNames.filter(name => 
    name.toLowerCase().includes(subSearch.toLowerCase())
  ).slice(0, 20);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh]"
      >
        <div className="flex-1 p-6 overflow-y-auto space-y-8 border-b md:border-b-0 md:border-r border-white/5">
          {/* Background Selection */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-xs">1</span>
                背景カードを選択
              </h3>
              {selectedBg && <span className="text-xs text-indigo-400 font-medium">{selectedBg}</span>}
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="カード名で検索..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={bgSearch}
                onChange={(e) => setBgSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {filteredBg.map(name => (
                <button 
                  key={name}
                  onClick={() => setSelectedBg(name)}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${selectedBg === name ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-transparent hover:border-white/20'}`}
                >
                  <img src={getImagePath(name, 'background')} alt={name} className="w-full h-full object-cover" />
                  {selectedBg === name && (
                    <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                      <Check className="text-white" size={24} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Sub Selection */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs">2</span>
                サブカードを選択
              </h3>
              {selectedSub && <span className="text-xs text-purple-400 font-medium">{selectedSub}</span>}
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="カード名で検索..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {filteredSub.map(name => (
                <button 
                  key={name}
                  onClick={() => setSelectedSub(name)}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${selectedSub === name ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-transparent hover:border-white/20'}`}
                >
                  <img src={getImagePath(name, 'sub')} alt={name} className="w-full h-full object-contain p-1" />
                  {selectedSub === name && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <Check className="text-white" size={24} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Preview Panel */}
        <div className="w-full md:w-80 p-8 bg-slate-950/50 flex flex-col items-center justify-center gap-8 shrink-0">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-2">Preview</h3>
            <p className="text-sm text-slate-400">作成されるアイコンのプレビュー</p>
          </div>

          <div className="relative group">
            <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <DeckIcon 
              bgCard={selectedBg || 'おちゃめな魔法使い'} 
              subCard={selectedSub || undefined} 
              size="xl" 
              className="relative shadow-2xl shadow-indigo-500/20 border-2 border-white/10"
            />
          </div>

          <div className="w-full space-y-3">
            <button 
              disabled={!selectedBg || !selectedSub}
              onClick={() => {
                if (selectedBg && selectedSub) {
                  onAdd({ bgCard: selectedBg, subCard: selectedSub });
                  onClose();
                }
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              <span>デッキを追加</span>
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-2xl transition-all"
            >
              キャンセル
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
