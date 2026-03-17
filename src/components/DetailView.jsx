import { Newspaper, MessageCircle, Volume2, Quote, Loader2, Info } from "lucide-react";

function MetricBar({ label, value, icon: Icon, color, weight }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {weight && <span className="text-xs text-gray-600">({weight})</span>}
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

export default function DetailView({ todayDetail, selectedPolitician, loading }) {
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

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white mb-1">{entry.name}</h3>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
          {entry.party}
        </span>
      </div>

      {/* Overall Score */}
      <div className="text-center py-4">
        <div className="text-5xl font-bold text-white">{entry.overall_score.toFixed(1)}</div>
        <div className="text-sm text-gray-400 mt-1">Overall Score</div>
      </div>

      {/* Score Breakdown with Component Transparency */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Score Breakdown
          </h4>
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-gray-600 cursor-help" />
            <div className="hidden group-hover:block absolute left-0 top-5 z-10 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 w-56 shadow-lg">
              Overall score = weighted average of policy approval (40%), inverse hostility (35%),
              and media amplification (25%). Computed deterministically, not by the AI.
            </div>
          </div>
        </div>

        <MetricBar
          label="News Sentiment"
          value={entry.news_sentiment}
          icon={Newspaper}
          color="#6366f1"
          weight="40%"
        />
        <MetricBar
          label="Social Sentiment"
          value={entry.social_sentiment}
          icon={MessageCircle}
          color="#8b5cf6"
          weight="35%"
        />
        <MetricBar
          label="Media Volume"
          value={entry.media_volume}
          icon={Volume2}
          color="#a78bfa"
          weight="25%"
        />
      </div>

      {/* Component Transparency Bar */}
      <div className="flex h-2 rounded-full overflow-hidden">
        <div className="bg-indigo-500" style={{ width: "40%" }} title="Policy Approval: 40%" />
        <div className="bg-violet-500" style={{ width: "35%" }} title="Inv. Hostility: 35%" />
        <div className="bg-violet-300" style={{ width: "25%" }} title="Amplification: 25%" />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>Policy 40%</span>
        <span>Hostility 35%</span>
        <span>Volume 25%</span>
      </div>

      {/* Chain-of-Thought Analysis */}
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
