// components/ProjectionTab.tsx
import { useState, useMemo } from 'react';
import {
    calculateProjection,
    calculateSummary,
    generateInterpretation,
    getDefaultParams,
    type ProjectionParams,
} from '../utils/projectionCalculator';


interface ProjectionTabProps {
    item: any; // Tu item actual del screener
    peerStats?: any;
}

function ProjectionTab({ item }: ProjectionTabProps) {
    // Defaults
    const defaults = useMemo(() => getDefaultParams(item), [item]);

    // Estados para sliders
    const [growthEarly, setGrowthEarly] = useState(defaults.growthEarly * 100);
    const [growthMid, setGrowthMid] = useState(defaults.growthMid * 100);
    const [growthLate, setGrowthLate] = useState(defaults.growthLate * 100);
    const [marginOfSafety, setMarginOfSafety] = useState(defaults.marginOfSafety * 100);
    const [targetPrice, setTargetPrice] = useState<number | null>(null);

    // Calcular proyección en tiempo real
    const projections = useMemo(() => {
        const params: ProjectionParams = {
            ...defaults,
            growthEarly: growthEarly / 100,
            growthMid: growthMid / 100,
            growthLate: growthLate / 100,
            marginOfSafety: marginOfSafety / 100,
        };
        return calculateProjection(params);
    }, [growthEarly, growthMid, growthLate, marginOfSafety, defaults]);

    // Calcular resumen
    const summary = useMemo(() => {
        return calculateSummary(
            projections,
            targetPrice,
            item?.price ?? item?.regularMarketPrice ?? item?.currentPrice ?? 0  // ← agrega esto
        );
    }, [projections, targetPrice, item]);

    // Interpretación
    const interpretation = useMemo(() => {
        return generateInterpretation(item.ticker, summary, {
            ...defaults,
            growthEarly: growthEarly / 100,
            growthMid: growthMid / 100,
            growthLate: growthLate / 100,
        });
    }, [item.ticker, summary, defaults, growthEarly, growthMid, growthLate]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    📈 Proyección 10 Años
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Valuación conservadora con crecimiento decreciente
                </p>
            </div>

            {/* Parámetros ajustables */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">🎚️ Parámetros Ajustables</h3>

                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => {
                            setGrowthEarly(15);
                            setGrowthMid(10);
                            setGrowthLate(5);
                            // Opcional: resetear también margen y target si querés full conservador
                            // setMarginOfSafety(25);
                            // setTargetPrice(null);
                        }}
                        className="
  px-5 py-2.5
  bg-[#293445]              /* Color del botón de la captura */
  hover:bg-[#232C3B]        /* Hover más oscuro */
  active:bg-[#1F2734]       /* (Opcional) Active aún más oscuro */
  text-white
  font-medium
  text-sm
  rounded-lg
  shadow-md
  transition-all duration-200
  focus:outline-none
  focus:ring-2
  focus:ring-[#5E6774]      /* Ring más claro derivado del mismo color */
  focus:ring-offset-2
  focus:ring-offset-gray-900
"
                    >
                        Escenario Conservador (15% → 10% → 5%)
                    </button>
                </div>

                {/* Growth Inicial */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Growth Inicial (años 1-3): <span className="text-blue-600">{growthEarly.toFixed(1)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="0.5"
                        value={growthEarly}
                        onChange={(e) => setGrowthEarly(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Growth Medio */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Growth Medio (años 4-7): <span className="text-blue-600">{growthMid.toFixed(1)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="30"
                        step="0.5"
                        value={growthMid}
                        onChange={(e) => setGrowthMid(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Growth Final */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Growth Final (años 8-10): <span className="text-blue-600">{growthLate.toFixed(1)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.5"
                        value={growthLate}
                        onChange={(e) => setGrowthLate(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Margen de Seguridad */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Margen de Seguridad: <span className="text-blue-600">{marginOfSafety.toFixed(1)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={marginOfSafety}
                        onChange={(e) => setMarginOfSafety(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>

                {/* Target Price */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Precio Objetivo (Target Price):
                    </label>
                    <input
                        type="number"
                        placeholder="Ej: 150.00"
                        value={targetPrice || ''}
                        onChange={(e) => setTargetPrice(e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
            </div>

            {/* Resumen Ejecutivo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 5 años */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">
                        🎯 En 5 años
                    </h4>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold">${summary.year5.price.toFixed(2)}</p>
                        <p className="text-sm">Upside: <span className="font-semibold text-green-600">+{summary.year5.upside.toFixed(0)}%</span></p>
                        <p className="text-sm">ROI/año: <span className="font-semibold">{summary.year5.cagr.toFixed(1)}%</span></p>
                    </div>
                </div>

                {/* Card 10 años */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">
                        💰 En 10 años
                    </h4>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold">${summary.year10.price.toFixed(2)}</p>
                        <p className="text-sm">Upside: <span className="font-semibold text-green-600">+{summary.year10.upside.toFixed(0)}%</span></p>
                        <p className="text-sm">ROI/año: <span className="font-semibold">{summary.year10.cagr.toFixed(1)}%</span></p>
                    </div>
                </div>

                {/* Card Target Year */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">
                        🎯 Precio Objetivo
                    </h4>
                    <div className="space-y-1">
                        {summary.targetYear.yearDate ? (
                            <>
                                <p className="text-2xl font-bold">{summary.targetYear.yearDate}</p>
                                <p className="text-sm">En {summary.targetYear.year} años</p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">{summary.targetYear.message}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla Detallada */}
            <div className="overflow-x-auto">
                <h3 className="font-semibold text-lg mb-3">📋 Proyección Detallada</h3>
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            <th className="border px-3 py-2 text-left">Año</th>
                            <th className="border px-3 py-2 text-right">EPS</th>
                            <th className="border px-3 py-2 text-right">Graham</th>
                            <th className="border px-3 py-2 text-right">P/E×EPS</th>
                            <th className="border px-3 py-2 text-right">Precio Seguro</th>
                            <th className="border px-3 py-2 text-right">Upside</th>
                            <th className="border px-3 py-2 text-center">Señal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projections.map((proj) => (
                            <tr key={proj.year} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="border px-3 py-2 font-medium">{proj.yearDate}</td>
                                <td className="border px-3 py-2 text-right">${proj.eps.toFixed(2)}</td>
                                <td className="border px-3 py-2 text-right">${proj.grahamValue.toFixed(2)}</td>
                                <td className="border px-3 py-2 text-right">${proj.peValue.toFixed(2)}</td>
                                <td className="border px-3 py-2 text-right font-semibold">${proj.safePrice.toFixed(2)}</td>
                                <td className="border px-3 py-2 text-right">
                                    <span className={proj.upside > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {proj.upside > 0 ? '+' : ''}{proj.upside.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="border px-3 py-2 text-center text-xl">{proj.signal}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Interpretación */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    💡 Interpretación
                </h3>
                <p className="text-sm leading-relaxed">{interpretation}</p>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border-l-4 border-yellow-400">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    ⚠️ <strong>Nota:</strong> Estas proyecciones asumen condiciones normales y son estimaciones conservadoras.
                    Factores externos (recesiones, disrupciones tecnológicas, cambios regulatorios) pueden alterar significativamente
                    los resultados. No constituyen asesoramiento financiero.
                </p>
            </div>
        </div>
    );
}

export default ProjectionTab