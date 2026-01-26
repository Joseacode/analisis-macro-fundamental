// src/features/fundamental/utils/scoring.ts
import type { FundamentalSnapshot } from '../../../types/fundamental.types';

type Better = 'higher' | 'lower';

type MetricSpec = {
    key: keyof FundamentalSnapshot;
    label: string;
    better: Better;
    weight: number;
};

export type ScoreBuckets = {
    value: number;    // 0..100
    quality: number;  // 0..100
    growth: number;   // 0..100
    risk: number;     // 0..100
};

export type ScoredFundamental = FundamentalSnapshot & {
    score: number;        // 0..100
    buckets: ScoreBuckets;
};

function mean(xs: number[]) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[], m: number) {
    const v = xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / xs.length;
    return Math.sqrt(v);
}

function zScore(value: number, m: number, s: number) {
    if (s === 0) return 0;
    return (value - m) / s;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function normalizeTo100(raw: number, min: number, max: number) {
    if (max === min) return 50;
    return ((raw - min) / (max - min)) * 100;
}

const VALUE: MetricSpec[] = [
    { key: 'pe', label: 'P/E', better: 'lower', weight: 1.0 },
    { key: 'pb', label: 'P/B', better: 'lower', weight: 0.8 },
    { key: 'ps', label: 'P/S', better: 'lower', weight: 0.7 },
    { key: 'evEbitda', label: 'EV/EBITDA', better: 'lower', weight: 1.0 },
];

const QUALITY: MetricSpec[] = [
    { key: 'roe', label: 'ROE', better: 'higher', weight: 1.0 },
    { key: 'grossMargin', label: 'Gross Margin', better: 'higher', weight: 0.6 },
    { key: 'operatingMargin', label: 'Operating Margin', better: 'higher', weight: 0.9 },
    { key: 'netMargin', label: 'Net Margin', better: 'higher', weight: 0.7 },
];

const GROWTH: MetricSpec[] = [
    { key: 'epsGrowthYoY', label: 'EPS YoY', better: 'higher', weight: 1.0 },
    { key: 'revenueGrowthYoY', label: 'Revenue YoY', better: 'higher', weight: 0.9 },
];

const RISK: MetricSpec[] = [
    { key: 'debtToEquity', label: 'D/E', better: 'lower', weight: 1.0 },
    { key: 'beta', label: 'Beta', better: 'lower', weight: 0.7 },
    { key: 'currentRatio', label: 'Current Ratio', better: 'higher', weight: 0.4 }, // liquidez
];

function bucketRaw(items: FundamentalSnapshot[], specs: MetricSpec[]) {
    // Precompute mean/std per metric over peers
    const stats = new Map<string, { m: number; s: number }>();

    for (const spec of specs) {
        const vals = items
            .map((it) => it[spec.key])
            .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

        if (vals.length >= 2) {
            const m = mean(vals);
            const s = std(vals, m);
            stats.set(String(spec.key), { m, s });
        }
    }

    // raw score per item (weighted sum of z-scores)
    const raws = items.map((it) => {
        let raw = 0;
        let wSum = 0;

        for (const spec of specs) {
            const v = it[spec.key];
            const st = stats.get(String(spec.key));
            if (typeof v !== 'number' || !Number.isFinite(v) || !st) continue;

            let z = zScore(v, st.m, st.s);
            if (spec.better === 'lower') z = -z; // lower is better → invert

            raw += z * spec.weight;
            wSum += spec.weight;
        }

        // If no metrics available, return NaN raw (handled later)
        return wSum > 0 ? raw / wSum : Number.NaN;
    });

    return raws;
}

export function scoreFundamentals(items: FundamentalSnapshot[]): ScoredFundamental[] {
    if (!items.length) return [];

    const valueRaw = bucketRaw(items, VALUE);
    const qualityRaw = bucketRaw(items, QUALITY);
    const growthRaw = bucketRaw(items, GROWTH);
    const riskRaw = bucketRaw(items, RISK);

    const totalRaw = items.map((_, i) => {
        const parts = [valueRaw[i], qualityRaw[i], growthRaw[i], riskRaw[i]];
        const ok = parts.filter((x) => Number.isFinite(x)) as number[];
        if (!ok.length) return Number.NaN;

        // weights between buckets (podemos ajustar después)
        const w = { value: 0.30, quality: 0.30, growth: 0.25, risk: 0.15 };

        let sum = 0;
        let wSum = 0;

        if (Number.isFinite(valueRaw[i])) { sum += valueRaw[i] * w.value; wSum += w.value; }
        if (Number.isFinite(qualityRaw[i])) { sum += qualityRaw[i] * w.quality; wSum += w.quality; }
        if (Number.isFinite(growthRaw[i])) { sum += growthRaw[i] * w.growth; wSum += w.growth; }
        if (Number.isFinite(riskRaw[i])) { sum += riskRaw[i] * w.risk; wSum += w.risk; }

        return wSum > 0 ? sum / wSum : Number.NaN;
    });

    // Normalize bucket raws & total raw to 0..100 (min-max over peers)
    function norm(raws: number[]) {
        const finite = raws.filter((x) => Number.isFinite(x));
        if (finite.length < 2) return raws.map(() => 50);

        const min = Math.min(...finite);
        const max = Math.max(...finite);
        return raws.map((r) => (Number.isFinite(r) ? clamp(normalizeTo100(r, min, max), 0, 100) : 50));
    }

    const valueN = norm(valueRaw);
    const qualityN = norm(qualityRaw);
    const growthN = norm(growthRaw);
    const riskN = norm(riskRaw);
    const totalN = norm(totalRaw);

    return items.map((it, i) => ({
        ...it,
        buckets: {
            value: valueN[i],
            quality: qualityN[i],
            growth: growthN[i],
            risk: riskN[i],
        },
        score: totalN[i],
    }));
}