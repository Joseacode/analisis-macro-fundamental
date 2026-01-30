import { useEffect, useState } from "react";
import { secLatestFilingDocs, secDocUrl } from "../../../services/secService";

type DocRow = {
    doc: string;
    description: string | null;
    type: string | null;
    size: string | null;
    url: string;
};

export function FilingsPanel({ ticker, form }: { ticker: string; form: "8-K" | "10-Q" | "10-K" }) {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [meta, setMeta] = useState<{ cik?: number; accession?: string }>({});

    useEffect(() => {
        const t = ticker.trim().toUpperCase();
        if (!t) {
            setErr(null);
            setDocs([]);
            setMeta({});
            return; // ✅ no llamar API si ticker vacío
        }

        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setErr(null);

                const res = await secLatestFilingDocs(t, form);
                if (!alive) return;

                setDocs(res.docs ?? []);
                setMeta({ cik: res.cik, accession: res.accessionNumber });
            } catch (e: any) {
                if (!alive) return;
                setErr(String(e?.message ?? e).slice(0, 600));
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [ticker, form]);

    return (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-baseline justify-between gap-3">
                <div className="text-slate-200 font-semibold">
                    {ticker || "—"} — último {form}
                </div>
                {meta.cik && meta.accession && (
                    <div className="text-slate-500 text-xs">
                        CIK {meta.cik} · Acc {meta.accession}
                    </div>
                )}
            </div>

            {loading && <div className="text-slate-300 mt-3">Cargando…</div>}
            {err && <div className="text-red-400 mt-3 whitespace-pre-wrap">{err}</div>}

            {!loading && !err && (
                <div className="mt-3">
                    {docs.length === 0 ? (
                        <div className="text-slate-400">No se encontraron documentos.</div>
                    ) : (
                        <ul className="space-y-2">
                            {docs.map((d, i) => {
                                const filename = d.url.split("/").pop() ?? "";
                                const href =
                                    meta.cik && meta.accession && filename
                                        ? secDocUrl({ cik: meta.cik, accession: meta.accession, filename })
                                        : d.url;

                                return (
                                    <li key={i} className="flex flex-col">
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline"
                                        >
                                            {d.doc}
                                        </a>
                                        <div className="text-slate-500 text-sm">
                                            {d.type ?? "?"}
                                            {d.size ? ` · ${d.size}` : ""}
                                            {d.description ? ` · ${d.description}` : ""}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
