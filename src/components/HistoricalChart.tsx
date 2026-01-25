import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchHistoricalData, FRED_SERIES } from '../services/dataService';

interface HistoricalChartProps {
    seriesId: keyof typeof FRED_SERIES;
    title: string;
    color?: string;
    days?: number;
}

interface ChartDataPoint {
    date: string;
    value: number;
}

export function HistoricalChart({ seriesId, title, color = '#00D9FF', days = 90 }: HistoricalChartProps) {
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            setError(null);
            try {
                const series = FRED_SERIES[seriesId];

                // mínimos razonables para series de baja frecuencia
                const minDaysBySeries: Partial<Record<keyof typeof FRED_SERIES, number>> = {
                    cpi: 450,          // ~15 meses (permite ver YoY con forma)
                    unemployment: 450, // mensual
                    gdp: 1200,         // trimestral (si lo graficás en algún momento)
                };

                const effectiveDays = Math.max(days, minDaysBySeries[seriesId] ?? days);

                // CPI como inflación interanual (%) usando unidades FRED
                const units = seriesId === 'cpi' ? 'pc1' : undefined;

                const historicalData = await fetchHistoricalData(series, effectiveDays, { units });
                if (historicalData.length === 0) {
                    setError('No data available');
                } else {
                    setData(historicalData);
                }
            } catch (err) {
                setError('Failed to load data');
                console.error('Chart error:', err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [seriesId, days]);

    if (loading) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                </div>
            </div>
        );
    }

    if (error || data.length === 0) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
                <div className="h-64 flex items-center justify-center text-slate-400">
                    {error || 'No data available'}
                </div>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#cbd5e1' }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        name={title}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
