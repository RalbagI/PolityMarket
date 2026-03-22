import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown } from "lucide-react";
import { localizeName } from "../lib/localize";

export default function TopMoversStrip({ data, onSelect }) {
  const { t } = useTranslation();

  const { risers, fallers } = useMemo(() => {
    if (!data || !data.length) return { risers: [], fallers: [] };

    const withDelta = data.filter((d) => d.delta != null && d.delta !== 0);
    const sorted = [...withDelta].sort((a, b) => b.delta - a.delta);

    return {
      risers: sorted.filter((d) => d.delta > 0).slice(0, 3),
      fallers: sorted
        .filter((d) => d.delta < 0)
        .slice(-3)
        .reverse(),
    };
  }, [data]);

  if (!risers.length && !fallers.length) {
    return (
      <div
        className="flex items-center justify-center min-h-[44px] text-xs text-gray-600"
        role="region"
        aria-label={t("topMovers.ariaLabel")}
      >
        {t("topMovers.noChanges")}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3 min-h-[48px] overflow-x-auto"
      role="region"
      aria-label={t("topMovers.ariaLabel")}
    >
      {/* Risers */}
      {risers.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider shrink-0">
            {t("topMovers.risers")}
          </span>
          {risers.map((d) => (
            <button
              key={d.politician_id || d.name}
              onClick={() => onSelect(d.name)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0"
              aria-label={`${d.displayName || localizeName(t, d.name)}: +${d.delta.toFixed(1)}`}
            >
              <span className="text-xs text-gray-200 font-medium truncate max-w-[80px]">
                {d.displayName || localizeName(t, d.name)}
              </span>
              <span className="text-xs text-emerald-400 font-bold tabular-nums">
                +{d.delta.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {risers.length > 0 && fallers.length > 0 && <div className="w-px h-5 bg-gray-700 shrink-0" />}

      {/* Fallers */}
      {fallers.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-[10px] text-red-500/70 font-medium uppercase tracking-wider shrink-0">
            {t("topMovers.fallers")}
          </span>
          {fallers.map((d) => (
            <button
              key={d.politician_id || d.name}
              onClick={() => onSelect(d.name)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors shrink-0"
              aria-label={`${d.displayName || localizeName(t, d.name)}: ${d.delta.toFixed(1)}`}
            >
              <span className="text-xs text-gray-200 font-medium truncate max-w-[80px]">
                {d.displayName || localizeName(t, d.name)}
              </span>
              <span className="text-xs text-red-400 font-bold tabular-nums">
                {d.delta.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
