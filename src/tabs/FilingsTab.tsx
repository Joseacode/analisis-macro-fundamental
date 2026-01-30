import { useEffect, useMemo, useState } from "react";
import { FilingsPanel } from "../features/fundamental/components/FilingsPanel";

export function FilingsTab() {
    const [tickerInput, setTickerInput] = useState("AAPL");
    const [ticker, setTicker] = useState("AAPL");
    const [form, setForm] = useState<"8-K" | "10-Q" | "10-K">("8-K");

    // Debounce: evita pegarle a la API en cada tecla (y evita el estado "")
    useEffect(() => {
        const t = setTimeout(() => {
            const clean = tickerInput.trim().toUpperCase();
            if (clean) setTicker(clean);
        }, 350);
        return () => clearTimeout(t);
    }, [tickerInput]);

    const cleanTicker = useMemo(() => ticker.trim().toUpperCase(), [ticker]);

    return (
        <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2 items-center">
                <div className="text-slate-200 font-semibold">SEC Filings</div>

                <input
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 w-36"
                    placeholder="AAPL"
                />

                <select
                    value={form}
                    onChange={(e) => setForm(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
                >
                    <option value="8-K">8-K (earnings release suele estar acá)</option>
                    <option value="10-Q">10-Q</option>
                    <option value="10-K">10-K</option>
                </select>

                <div className="text-slate-400 text-sm">
                    Tip: buscá EX-99.* para “earnings release”
                </div>
            </div>

            <div className="mt-4">
                <FilingsPanel ticker={cleanTicker} form={form} />
            </div>
        </div>
    );
}
