// utils/projectionCalculator.ts

export interface ProjectionParams {
    currentEPS: number;
    currentPrice: number;
    currentPE: number;
    epsGrowthYoY: number;
    marginOfSafety: number;
    growthEarly: number;  // Años 1-3
    growthMid: number;    // Años 4-7
    growthLate: number;   // Años 8-10
}

export interface YearProjection {
    year: number;
    yearDate: number;
    eps: number;
    growthRate: number;
    grahamValue: number;
    peValue: number;
    hybridValue: number;
    safePrice: number;
    upside: number;
    cagr: number;
    signal: '🟢' | '🟡' | '🔵' | '🔴';
}

export interface ProjectionSummary {
    year5: {
        eps: number;
        price: number;
        upside: number;
        cagr: number;
    };
    year10: {
        eps: number;
        price: number;
        upside: number;
        cagr: number;
    };
    targetYear: {
        year: number | null;
        yearDate: number | null;
        message: string;
    };
}

// Función Graham corregida y con bondYield opcional
function calculateGraham(eps: number, growthRate: number, bondYield: number = 4.4): number {
    if (eps <= 0) return 0;

    const g = growthRate * 100; // crecimiento en porcentaje
    const sqrtTerm = Math.sqrt(6 + 2 * g); // √(6 + 2g)
    const adjustment = 4.4 / bondYield;   // factor de ajuste por yield AAA

    return eps * sqrtTerm * adjustment;
}

// Determinar señal según upside
function getSignal(upside: number): '🟢' | '🟡' | '🔵' | '🔴' {
    if (upside > 30) return '🟢';
    if (upside > 10) return '🟡';
    if (upside >= 0) return '🔵';
    return '🔴';
}

// Proyección completa 10 años
export function calculateProjection(params: ProjectionParams): YearProjection[] {
    if (params.currentEPS <= 0 || params.currentPrice <= 0) {
        console.warn("EPS o precio actual inválido → proyección imposible");
        return [];
    }

    const projections: YearProjection[] = [];
    let currentEPS = params.currentEPS;
    const currentYear = new Date().getFullYear(); // ← FIX: declaración aquí

    for (let year = 1; year <= 10; year++) {
        // Determinar growth rate según el año
        let growthRate: number;
        if (year <= 3) {
            growthRate = params.growthEarly;
        } else if (year <= 7) {
            growthRate = params.growthMid;
        } else {
            growthRate = params.growthLate;
        }

        // Proyectar EPS
        currentEPS = currentEPS * (1 + growthRate);

        // Calcular valores
        const grahamValue = calculateGraham(currentEPS, growthRate); // ← sin 3er arg (opcional)
        const peValue = currentEPS * params.currentPE;

        // Híbrido: 70% Graham + 30% P/E
        const hybridValue = grahamValue * 0.7 + peValue * 0.3;

        // Precio con margen de seguridad
        const safePrice = hybridValue * (1 - params.marginOfSafety);

        // Upside vs precio actual
        const upside = params.currentPrice > 0
            ? ((safePrice - params.currentPrice) / params.currentPrice) * 100
            : 0;

        // CAGR acumulado
        const cagr = (Math.pow(safePrice / params.currentPrice, 1 / year) - 1) * 100;

        // Señal
        const signal = getSignal(upside);

        projections.push({
            year,
            yearDate: currentYear + year,
            eps: currentEPS,
            growthRate,
            grahamValue,
            peValue,
            hybridValue,
            safePrice,
            upside,
            cagr,
            signal,
        });
    }

    return projections;
}

// Calcular resumen ejecutivo
export function calculateSummary(
    projections: YearProjection[],
    targetPrice: number | null,
    currentPrice: number, // ← Agregado para comparar target vs current

): ProjectionSummary {
    if (projections.length === 0) {
        return {
            year5: { eps: 0, price: 0, upside: 0, cagr: 0 },
            year10: { eps: 0, price: 0, upside: 0, cagr: 0 },
            targetYear: { year: null, yearDate: null, message: 'Sin datos para proyección' }
        };
    }

    const year5 = projections[4];
    const year10 = projections[9];

    let targetYear: ProjectionSummary['targetYear'] = {
        year: null,
        yearDate: null,
        message: 'Ingresa un precio objetivo',
    };

    if (targetPrice !== null && targetPrice > 0) {
        if (targetPrice <= currentPrice) {
            targetYear = {
                year: new Date().getFullYear(),
                yearDate: new Date().getFullYear(),
                message: `Ya superado con el precio actual ($${currentPrice.toFixed(2)})`
            };
        } else {
            const targetProj = projections.find((p) => p.safePrice >= targetPrice);

            if (targetProj) {
                targetYear = {
                    year: targetProj.year,
                    yearDate: targetProj.yearDate,
                    message: `Se alcanzaría en ${targetProj.yearDate} (${targetProj.year} años)`
                };
            } else {
                targetYear = {
                    year: null,
                    yearDate: null,
                    message: 'No se alcanza en 10 años con estos parámetros'
                };
            }
        }
    }

    return {
        year5: {
            eps: year5.eps,
            price: year5.safePrice,
            upside: year5.upside,
            cagr: year5.cagr,
        },
        year10: {
            eps: year10.eps,
            price: year10.safePrice,
            upside: year10.upside,
            cagr: year10.cagr,
        },
        targetYear,
    };
}

// Generar interpretación automática
export function generateInterpretation(
    ticker: string,
    summary: ProjectionSummary,
    params: ProjectionParams
): string {
    const { year5, year10, targetYear } = summary;

    const growthText = `${(params.growthEarly * 100).toFixed(0)}% → ${(params.growthMid * 100).toFixed(0)}% → ${(params.growthLate * 100).toFixed(0)}%`;

    let text = `Con un crecimiento conservador decreciente (${growthText}), ${ticker} podría alcanzar $${year10.price.toFixed(2)} en 10 años, generando un retorno anualizado de ${year10.cagr.toFixed(1)}%. `;



    if (year5.upside > 50) {
        text += `En el mediano plazo (5 años), muestra un potencial de upside significativo (+${year5.upside.toFixed(0)}%). `;
    } else if (year5.upside > 20) {
        text += `En el mediano plazo (5 años), muestra un potencial moderado (+${year5.upside.toFixed(0)}%). `;
    } else {
        text += `En el mediano plazo (5 años), el potencial de revalorización es limitado (+${year5.upside.toFixed(0)}%). `;
    }

    if (targetYear.year !== null) {
        text += `Tu precio objetivo se alcanzaría ${targetYear.message.toLowerCase()}.`;
    }

    return text;
}

// Defaults inteligentes (con mapeo robusto de campos Yahoo)
// Defaults inteligentes (con priorización de long-term growth de analistas)
export function getDefaultParams(item: any): ProjectionParams {
    // Extraer EPS de posibles campos de Yahoo (mismo que antes)
    let epsTTM =
        item.epsTTM ||
        item.eps ||
        item.trailingEps ||
        item.financialData?.epsTrailingTwelveMonths ||
        item.defaultKeyStatistics?.trailingEps ||
        item.summaryDetail?.trailingEps ||
        item.keyStats?.trailingEps ||
        0;

    if (epsTTM <= 0) {
        console.warn(`EPS TTM no disponible o <=0 para ${item.ticker || 'ticker desconocido'}. Campos disponibles:`, Object.keys(item));
    }

    // Priorizar long-term growth estimate de analistas (más estable y realista)
    let longTermGrowth =
        item.earningsTrend?.longTermGrowthRate ||   // Campo principal de Yahoo para 5-10 años
        item.longTermExpectedGrowth ||              // Alternativa posible
        item.epsGrowthYoY ||                        // Fallback a YoY si no hay long-term
        item.earningsGrowth ||
        0.10;                                       // Default conservador 10%

    // Validaciones
    if (longTermGrowth < 0) longTermGrowth = 0;
    if (longTermGrowth > 0.35) longTermGrowth = 0.35; // Cap agresivo a 35% max (evita 50%+ en maduras)

    let pe =
        item.pe ||
        item.trailingPE ||
        item.defaultKeyStatistics?.trailingPE ||
        item.summaryDetail?.trailingPE ||
        item.peerStats?.pe ||
        20;

    if (pe <= 0 || isNaN(pe)) pe = 20;

    // Cap dinámico según perfil de la empresa
    let maxGrowthCap = 0.25; // default conservador

    // Si P/E alto o sector Tech → más agresivo
    if (item.pe > 40 || item.sector?.includes('Technology') || item.sector?.includes('Information')) {
        maxGrowthCap = 0.40; // hasta 40% para growth stocks
    }

    if (longTermGrowth > maxGrowthCap) {
        longTermGrowth = maxGrowthCap;
    }

    return {
        currentEPS: epsTTM,
        currentPrice: item.price || item.regularMarketPrice || item.currentPrice || 0,
        currentPE: pe,
        epsGrowthYoY: longTermGrowth,  // ← Cambiado: usamos long-term como base
        marginOfSafety: 0.25,
        growthEarly: longTermGrowth,
        growthMid: longTermGrowth * 0.67,
        growthLate: longTermGrowth * 0.33,
    };
}