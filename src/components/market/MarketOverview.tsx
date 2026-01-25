import {
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend
} from 'recharts';

interface MarketOverviewProps {
    marketData: any[];
    volumeData: any[];
}

export const MarketOverview = ({ marketData, volumeData }: MarketOverviewProps) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Market Trends */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4">Market Trends</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={marketData}>
                        <defs>
                            <linearGradient id="colorSP500" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorNASDAQ" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        <Legend />
                        <Area type="monotone" dataKey="SP500" stroke="#06b6d4" fillOpacity={1} fill="url(#colorSP500)" />
                        <Area type="monotone" dataKey="NASDAQ" stroke="#a855f7" fillOpacity={1} fill="url(#colorNASDAQ)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Volume Analysis */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4">Volume Analysis</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={volumeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        <Bar dataKey="volume" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* GDP Growth */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4">GDP Growth Rate</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={marketData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="GDP" stroke="#22c55e" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Market Summary */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-bold text-white mb-4">Market Summary</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="pb-3 text-sm font-medium text-slate-400">Index</th>
                                <th className="pb-3 text-sm font-medium text-slate-400">Price</th>
                                <th className="pb-3 text-sm font-medium text-slate-400">Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-700/50">
                                <td className="py-3 text-white">S&P 500</td>
                                <td className="py-3 text-white">5,350</td>
                                <td className="py-3 text-green-400">+2.8%</td>
                            </tr>
                            <tr className="border-b border-slate-700/50">
                                <td className="py-3 text-white">NASDAQ</td>
                                <td className="py-3 text-white">16,800</td>
                                <td className="py-3 text-green-400">+3.1%</td>
                            </tr>
                            <tr className="border-b border-slate-700/50">
                                <td className="py-3 text-white">DOW JONES</td>
                                <td className="py-3 text-white">38,500</td>
                                <td className="py-3 text-green-400">+1.9%</td>
                            </tr>
                            <tr>
                                <td className="py-3 text-white">RUSSELL 2000</td>
                                <td className="py-3 text-white">2,050</td>
                                <td className="py-3 text-red-400">-0.5%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
