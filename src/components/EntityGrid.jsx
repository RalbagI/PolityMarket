import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import EntityCard from "./EntityCard";

export default function EntityGrid({ todayData, yesterdayData, selectedPolitician, onSelect }) {
  const { t } = useTranslation();

  const cardsWithDelta = useMemo(() => {
    return todayData
      .map((entry) => {
        const prev = yesterdayData.find((y) => y.name === entry.name);
        const delta = prev ? entry.overall_score - prev.overall_score : null;
        return { entry, delta };
      })
      .sort((a, b) => b.entry.overall_score - a.entry.overall_score);
  }, [todayData, yesterdayData]);

  if (!cardsWithDelta.length) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{t("leaderboard.title")}</h3>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        }}
      >
        {cardsWithDelta.map(({ entry, delta }) => (
          <EntityCard
            key={entry.politician_id || entry.name}
            entry={entry}
            delta={delta}
            isSelected={selectedPolitician === entry.name}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
