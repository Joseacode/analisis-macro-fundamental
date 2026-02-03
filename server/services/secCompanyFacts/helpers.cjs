function diffDaysISO(a, b) {
    // b - a in days
    const da = parseISODate(a);
    const db = parseISODate(b);
    if (!da || !db) return null;
    const ms = db.getTime() - da.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

function parseISODate(d) {
    // d = 'YYYY-MM-DD'
    if (!d) return null;
    const t = Date.parse(`${d}T00:00:00Z`);
    return Number.isFinite(t) ? new Date(t) : null;
}

function toISODate(dt) {
    if (!dt) return null;
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normFp(fp) {
    return String(fp ?? '').toUpperCase();
}

function isQuarterLike(it) {
    const fp = normFp(it?.fp);
    return fp === 'Q1' || fp === 'Q2' || fp === 'Q3' || fp === 'Q4';
}

function isQuarterByDuration(it) {
    // SEC a veces no trae fp, pero la duración del quarter suele ser ~90 días.
    if (!it?.start || !it?.end) return false;
    const d = diffDaysISO(it.start, it.end);
    if (d == null) return false;
    return d >= 70 && d <= 120;
}

function uniqueByEndPickBest(items) {
    // Dedup por end, preferir 10-Q, luego filed presente, luego frame.
    const best = new Map();
    const score = (it) => {
        let s = 0;
        if (String(it?.form ?? '').toUpperCase() === '10-Q') s += 10;
        if (it?.filed) s += 5;
        if (it?.frame) s += 1;
        // penalizar FY
        if (normFp(it?.fp) === 'FY') s -= 50;
        return s;
    };

    for (const it of items || []) {
        if (!it?.end) continue;
        const prev = best.get(it.end);
        if (!prev || score(it) > score(prev)) best.set(it.end, it);
    }

    return Array.from(best.values());
}

'use strict';

/**
 * Selecciona “anchors” (periodos) para construir la serie quarterly.
 * Estrategia:
 *  - aceptar Q1–Q4 por fp
 *  - si fp no existe, aceptar si form=10-Q
 *  - si tampoco, aceptar si la duración sugiere quarter (~90 días)
 *  - eliminar FY / 10-K cuando estamos buscando quarterly
 *  - dedup por end con uniqueByEndPickBest
 *  - ordenar por end desc
 */
function selectAnchorsRobust(items, opts = {}) {
    const {
        max = 12,
        allow10QFallback = true,
    } = opts;

    const norm = (x) => String(x ?? '').toUpperCase().trim();

    // 1) Filtrar items inválidos (sin end)
    const valid = (items || []).filter((it) => {
        if (!it || !it.end) return false;
        // end tiene que parsear a fecha válida
        const d = new Date(it.end);
        return !Number.isNaN(d.getTime());
    });

    // 2) Clasificador “es quarter”
    const isQuarter = (it) => {
        const fp = normFp(it?.fp);
        if (fp && ['Q1', 'Q2', 'Q3', 'Q4'].includes(fp)) return true;

        const form = norm(it?.form);
        if (allow10QFallback && form === '10-Q') return true;

        // fallback por duración
        if (isQuarterByDuration(it)) return true;

        return false;
    };

    // 3) Excluir FY “duros”
    const isFY = (it) => {
        const fp = normFp(it?.fp);
        if (fp === 'FY') return true;
        const form = norm(it?.form);
        if (form === '10-K') return true;
        return false;
    };

    // 4) Aplicar filtros
    const quarterly = valid.filter((it) => isQuarter(it) && !isFY(it));

    // 5) Dedup por end (preferir 10-Q, filed, frame, penalizar FY)
    const dedup = uniqueByEndPickBest(quarterly);

    // 6) Ordenar por end desc (más reciente primero)
    dedup.sort((a, b) => new Date(b.end) - new Date(a.end));

    // 7) Recortar
    return dedup.slice(0, max);
}

function collectAllFactItems(companyFacts) {
    const out = [];
    const facts = companyFacts?.facts;
    if (!facts || typeof facts !== 'object') return out;

    for (const tax of Object.keys(facts)) {
        const taxObj = facts[tax];
        if (!taxObj || typeof taxObj !== 'object') continue;

        for (const concept of Object.keys(taxObj)) {
            const cObj = taxObj[concept];
            const units = cObj?.units;
            if (!units || typeof units !== 'object') continue;

            for (const unit of Object.keys(units)) {
                const arr = units[unit];
                if (!Array.isArray(arr)) continue;

                for (const it of arr) {
                    if (!it) continue;
                    // guardamos también concept/unit por si querés debug
                    out.push({ ...it, concept, unit, taxonomy: tax });
                }
            }
        }
    }
    return out;
}

function normalizeEndStart(items) {
    return (items || []).map((it) => ({
        ...it,
        // tu selector mira end/start sí o sí:
        end: it?.end || it?.quarter_end_date || it?.period_end || it?.periodEnd || it?.fy_end || null,
        start: it?.start || it?.period_start || it?.periodStart || null,
        // y form/fp/filed si existieran:
        fp: it?.fp ?? it?.fiscal_period ?? it?.period ?? null,
        form: it?.form ?? it?.report_form ?? null,
        filed: it?.filed ?? it?.filing_date ?? it?.filedAt ?? null,
    }));
}



module.exports = {
    normFp,
    diffDaysISO,
    parseISODate,
    toISODate,
    isQuarterByDuration,
    uniqueByEndPickBest,
    isQuarterLike,
    selectAnchorsRobust,
    normalizeEndStart,
    collectAllFactItems
};
