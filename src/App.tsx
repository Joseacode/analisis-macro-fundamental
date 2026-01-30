// src/App.tsx

import { useEffect, useState } from 'react';
import { NotificationCenter } from './components/NotificationCenter';
import { SettingsPanel } from './components/SettingsPanel';
import { useAppDispatch } from './app/hooks';
import { fetchMacroData } from './features/macro/macroSlice';

import { MacroTab } from './tabs/MacroTab';
import { FundamentalTab } from './tabs/FundamentalTab';
import { FilingsTab } from './tabs/FilingsTab';

type TabKey = 'macro' | 'fundamental' | 'filings';

function App() {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<TabKey>('macro');

  useEffect(() => {
    dispatch(fetchMacroData() as any);
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ✅ Header con notificaciones integradas */}
      <header className="border-b border-slate-800">
        <div className="px-6 py-4 flex justify-between items-center">
          {/* Left: DashboardHeader (título + subtítulo) */}
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">
              Institutional Macro Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time Market Analytics
            </p>
          </div>

          {/* Right: Campanita + Ruedita */}
          <div className="flex gap-3">
            <NotificationCenter />
            <SettingsPanel />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex gap-2 pt-4 pb-3">
          <button
            onClick={() => setTab('macro')}
            className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'macro'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            🧠 Macro
          </button>

          <button
            onClick={() => setTab('fundamental')}
            className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'fundamental'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            📚 Fundamental
          </button>

          <button
            onClick={() => setTab('filings')}
            className={`px-4 py-2 rounded-lg font-medium transition ${tab === 'filings'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            📄 Filings
          </button>
        </div>

        <div className="h-px bg-slate-800/60" />
      </div>

      {/* Tab content */}
      {tab === 'macro' ? (
        <MacroTab />
      ) : tab === 'fundamental' ? (
        <FundamentalTab />
      ) : (
        <FilingsTab />
      )}
    </div>
  );
}

export default App;
