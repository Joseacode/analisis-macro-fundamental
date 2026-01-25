export const FundamentalTab = () => {
    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📚</span>
                <h2 className="text-2xl font-bold text-cyan-400">Fundamental</h2>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <p className="text-slate-200 font-semibold mb-2">Próxima etapa</p>
                <p className="text-slate-400">
                    Acá vamos a construir el análisis fundamental del sector y empresas (peers, ratios, earnings, valuación, etc.).
                </p>
            </div>
        </div>
    );
};
