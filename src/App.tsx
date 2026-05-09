import { useState, useEffect } from 'react'
import { Plus, Share2, BarChart3, Grid3X3, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconMaker } from './components/IconMaker'
import { TierRow } from './components/TierRow'
import { MatchupChart } from './components/MatchupChart'
import { DistributionGraph } from './components/DistributionGraph'
import { DeckIcon } from './components/DeckIcon'

type Tab = 'tier' | 'matchup' | 'graph'

interface Deck {
  id: string;
  bgCard: string;
  subCard: string;
}

interface TierRowData {
  id: string;
  label: string;
  color: string;
  deckIds: string[];
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tier')
  const [isMakerOpen, setIsMakerOpen] = useState(false)
  const [decks, setDecks] = useState<Record<string, Deck>>({})
  const [tierRows, setTierRows] = useState<TierRowData[]>([
    { id: 's', label: 'S', color: '#ff7f7f', deckIds: [] },
    { id: 'a', label: 'A', color: '#ffbf7f', deckIds: [] },
    { id: 'b', label: 'B', color: '#ffff7f', deckIds: [] },
    { id: 'c', label: 'C', color: '#7fff7f', deckIds: [] },
  ])
  const [matchups, setMatchups] = useState<Record<string, Record<string, any>>>({})
  const [graphPositions, setGraphPositions] = useState<Record<string, any>>({})
  const [graphLabels, setGraphLabels] = useState({ x: '速度', y: '安定感' })

  // Load data from URL if ID exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      // Load from Firestore
    }
  }, [])

  const addDeck = (deckData: { bgCard: string, subCard: string }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newDeck = { id, ...deckData }
    setDecks(prev => ({ ...prev, [id]: newDeck }))
  }

  const removeDeckFromTier = (tierId: string, deckId: string) => {
    setTierRows(prev => prev.map(row => 
      row.id === tierId ? { ...row, deckIds: row.deckIds.filter(id => id !== deckId) } : row
    ))
  }

  const addDeckToTier = (tierId: string, deckId: string) => {
    setTierRows(prev => prev.map(row => 
      row.id === tierId ? { ...row, deckIds: [...new Set([...row.deckIds, deckId])] } : row
    ))
  }

  const handleShare = async () => {
    const id = Math.random().toString(36).substring(2, 12)
    // const data = {
    //   decks,
    //   tierRows,
    //   matchups,
    //   graphPositions,
    //   graphLabels
    // }
    // Save to Firestore logic here
    alert(`共有リンクを作成しました (ID: ${id})`)
  }

  const deckIds = Object.keys(decks)

  return (
    <div className="min-h-screen bg-[#060811] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-dark border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Anokoro Tier List</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deck Analysis Ecosystem</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20"
          >
            <Share2 size={18} />
            <span>保存・共有</span>
          </button>
        </div>
      </header>

      <div className="flex max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
        {/* Sidebar - Deck Pool */}
        <aside className="w-72 border-r border-white/5 p-6 flex flex-col gap-6 shrink-0 bg-black/20">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Deck Pool</h2>
            <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{deckIds.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {deckIds.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-white/10 opacity-30">
                <p className="text-xs font-medium">デッキがありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {deckIds.map(id => (
                  <motion.div 
                    layout
                    key={id}
                    draggable
                    onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('deckId', id)}
                    className="relative group cursor-grab active:cursor-grabbing"
                  >
                    <DeckIcon bgCard={decks[id].bgCard} subCard={decks[id].subCard} size="md" className="w-full h-auto aspect-square rounded-2xl" />
                    <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl border border-indigo-500/50" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsMakerOpen(true)}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
            <span>デッキを作成</span>
          </button>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
          {/* Navigation */}
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl w-fit shrink-0">
            <TabButton active={activeTab === 'tier'} onClick={() => setActiveTab('tier')} icon={<Layers size={18} />} label="Tier表" />
            <TabButton active={activeTab === 'matchup'} onClick={() => setActiveTab('matchup')} icon={<Grid3X3 size={18} />} label="相性表" />
            <TabButton active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={<BarChart3 size={18} />} label="分布図" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              {activeTab === 'tier' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic">ENVIRONMENT TIER</h2>
                      <p className="text-slate-500 font-medium">ドラッグ＆ドロップでデッキを配置してください</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {tierRows.map(row => (
                      <div 
                        key={row.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e: React.DragEvent) => {
                          const deckId = e.dataTransfer.getData('deckId')
                          if (deckId) addDeckToTier(row.id, deckId)
                        }}
                      >
                        <TierRow 
                          label={row.label} 
                          color={row.color} 
                          deckIds={row.deckIds} 
                          allDecks={decks} 
                          onRemoveDeck={(deckId) => removeDeckFromTier(row.id, deckId)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'matchup' && (
                <div className="space-y-8">
                   <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic">MATCHUP CHART</h2>
                    <p className="text-slate-500 font-medium">各デッキの相関関係を定義します</p>
                  </div>
                  <MatchupChart 
                    deckIds={deckIds} 
                    allDecks={decks} 
                    matchups={matchups} 
                    onChange={(id1, id2, val) => setMatchups(prev => ({
                      ...prev,
                      [id1]: { ...prev[id1], [id2]: val }
                    }))} 
                  />
                </div>
              )}

              {activeTab === 'graph' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic">DISTRIBUTION</h2>
                    <p className="text-slate-500 font-medium">デッキのポジショニングを可視化します</p>
                  </div>
                  <DistributionGraph 
                    deckIds={deckIds} 
                    allDecks={decks} 
                    positions={graphPositions} 
                    xAxisLabel={graphLabels.x} 
                    yAxisLabel={graphLabels.y}
                    onLabelsChange={(x, y) => setGraphLabels({ x, y })}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isMakerOpen && (
          <IconMaker 
            onAdd={addDeck} 
            onClose={() => setIsMakerOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
        ${active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default App
