import { Newspaper, MessageCircle, Volume2, Quote, Loader2 } from "lucide-react";

function MetricBar({ label, value, icon: Icon, color }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <span className="text-sm font-bold text-white">{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${(value / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export default function DetailView({ todayDetail, selectedPolitician, partyColors, loading }) {
  if (!selectedPolitician) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 text-sm text-center">
          Click a politician in the leaderboard to see their detailed breakdown
        </p>
      </div>
    );
  }

  if (loading || !todayDetail) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  const entry = todayDetail.find(
    (d) => d.name === selectedPolitician || d.politician_id === selectedPolitician
  );
  if (!entry) return null;

  const partyColor = partyColors[entry.party] || "#6b7280";

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white mb-1">{entry.name}</h3>
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: `${partyColor}20`,
            color: partyColor,
            border: `1px solid ${partyColor}40`,
          }}
        >
          {entry.party}
        </span>
      </div>

      {/* Overall Score */}
      <div className="text-center py-4">
        <div className="text-5xl font-bold text-white">{entry.overall_score.toFixed(1)}</div>
        <div className="text-sm text-gray-400 mt-1">Overall Score</div>
      </div>

      {/* Breakdown */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Score Breakdown
        </h4>
        <MetricBar
          label="News Sentiment"
          value={entry.news_sentiment}
          icon={Newspaper}
          color="#3b82f6"
        />
        <MetricBar
          label="Social Sentiment"
          value={entry.social_sentiment}
          icon={MessageCircle}
          color="#8b5cf6"
        />
        <MetricBar label="Media Volume" value={entry.media_volume} icon={Volume2} color="#f59e0b" />
      </div>

      {/* Chain-of-Thought Analysis — lazy-loaded from detail file */}
      {(entry.chain_of_thought || entry.llm_reasoning) && (
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Quote className="w-4 h-4" />
            <span>AI Analysis</span>
          </div>
          <p className="text-sm text-gray-300 italic leading-relaxed">
            &ldquo;{entry.chain_of_thought || entry.llm_reasoning}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
