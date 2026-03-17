import { TrendingUp, TrendingDown } from "lucide-react";

export default function HeroSection({ mover, partyColors }) {
  const isPositive = mover.delta > 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
        <span>Biggest Mover Today</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{mover.name}</h2>
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${partyColors[mover.party]}20`,
              color: partyColors[mover.party],
              border: `1px solid ${partyColors[mover.party]}40`,
            }}
          >
            {mover.party}
          </span>
        </div>

        <div className="flex items-end gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Overall Score</div>
            <div className="text-4xl font-bold text-white">{mover.overall_score.toFixed(1)}</div>
          </div>
          <div
            className={`flex items-center gap-1 text-2xl font-bold ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            {isPositive ? "+" : ""}
            {mover.delta.toFixed(1)}
          </div>
        </div>
      </div>

      {(mover.chain_of_thought || mover.llm_reasoning) && (
        <p className="mt-4 text-sm text-gray-400 border-t border-gray-700 pt-4 italic">
          &ldquo;{mover.chain_of_thought || mover.llm_reasoning}&rdquo;
        </p>
      )}
    </div>
  );
}
