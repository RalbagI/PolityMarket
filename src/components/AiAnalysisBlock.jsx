import { useTranslation } from "react-i18next";
import { parseChainOfThought } from "../lib/parseChainOfThought";

export default function AiAnalysisBlock({ text }) {
  const { t } = useTranslation();
  const parsed = parseChainOfThought(text);

  if (!parsed) {
    return <p className="text-sm text-gray-500">{t("detailView.aiAnalysis.empty")}</p>;
  }

  if (parsed.isLegacy) {
    return (
      <p className="text-sm text-gray-300 italic leading-relaxed">&ldquo;{parsed.raw}&rdquo;</p>
    );
  }

  return (
    <div className="space-y-3">
      {parsed.bottomLine && (
        <div className="border-s-2 border-indigo-500 ps-3">
          <p className="text-base font-semibold text-gray-100 leading-relaxed">
            {parsed.bottomLine}
          </p>
        </div>
      )}

      {parsed.whatHappened && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            {t("detailView.aiAnalysis.whatHappened")}
          </h4>
          <ul className="space-y-1.5">
            {parsed.whatHappened
              .split("\n")
              .filter((l) => l.trim())
              .map((line, i) => (
                <li key={i} className="text-sm text-gray-300 leading-relaxed">
                  {line.replace(/^•\s*/, "• ")}
                </li>
              ))}
          </ul>
        </div>
      )}

      {parsed.whatItMeans && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            {t("detailView.aiAnalysis.whatItMeans")}
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed">{parsed.whatItMeans}</p>
        </div>
      )}
    </div>
  );
}
