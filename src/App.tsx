import { useEffect, useState } from 'react';
import { DashboardHeader } from './components/ui/DashboardHeader';
import { useAppDispatch } from './app/hooks';
import { fetchMacroData } from './features/macro/macroSlice';

import { MacroTab } from './tabs/MacroTab';
import { FundamentalTab } from './tabs/FundamentalTab';

type TabKey = 'macro' | 'fundamental';

function App() {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<TabKey>('macro');

  useEffect(() => {
    // El thunk ya hace load + calculateRegime
    dispatch(fetchMacroData() as any);
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader />

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
        </div>

        <div className="h-px bg-slate-800/60" />
      </div>

      {/* Tab content */}
      {tab === 'macro' ? <MacroTab /> : <FundamentalTab />}
    </div>
  );
}

export default App;
