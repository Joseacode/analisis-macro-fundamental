import { Bell, Settings } from 'lucide-react';

export const DashboardHeader = () => {
    return (
        <header className="bg-slate-900 border-b border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-cyan-400">
                        Institutional Macro Dashboard
                    </h1>
                    <p className="text-sm text-slate-400">
                        Real-time Market Analytics
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-slate-800 rounded-lg transition">
                        <Bell className="w-5 h-5 text-slate-300" />
                    </button>

                    <button className="p-2 hover:bg-slate-800 rounded-lg transition">
                        <Settings className="w-5 h-5 text-slate-300" />
                    </button>
                </div>
            </div>
        </header>
    );
};
