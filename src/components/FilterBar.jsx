import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Filter, X, ChevronDown } from "lucide-react";
import { localizeParty } from "../lib/localize";
import { getPartyColor } from "../lib/partyColors";

function FilterChip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? "border-white/30 text-white"
          : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
      }`}
      style={active ? { backgroundColor: color || "#4f46e5" } : {}}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-medium text-gray-400 uppercase tracking-wider mb-2"
      >
        <span>{title}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );
}

export default function FilterBar({
  parties,
  wings,
  sectors,
  activeParties,
  activeWings,
  activeSectors,
  toggleFilter,
  clearFilters,
  visibleCount,
  totalCount,
}) {
  const { t } = useTranslation();
  const hasFilters = activeParties.length || activeWings.length || activeSectors.length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Filter className="w-3.5 h-3.5" />
          <span>
            {visibleCount}/{totalCount}
          </span>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
          >
            <X className="w-3 h-3" />
            {t("filterBar.clearFilters")}
          </button>
        )}
      </div>

      {/* Wing filter */}
      <FilterSection title={t("filterBar.wing")} defaultOpen={true}>
        {wings.map((wing) => (
          <FilterChip
            key={wing}
            label={t(`filterBar.wings.${wing}`)}
            active={activeWings.includes(wing)}
            color="#6366f1"
            onClick={() => toggleFilter("wings", wing)}
          />
        ))}
      </FilterSection>

      {/* Party filter */}
      <FilterSection title={t("filterBar.party")}>
        {parties.map((party) => (
          <FilterChip
            key={party}
            label={localizeParty(t, party)}
            active={activeParties.includes(party)}
            color={getPartyColor(party).bg}
            onClick={() => toggleFilter("parties", party)}
          />
        ))}
      </FilterSection>

      {/* Sector filter */}
      <FilterSection title={t("filterBar.sector")}>
        {sectors.map((sector) => (
          <FilterChip
            key={sector}
            label={t(`filterBar.sectors.${sector}`)}
            active={activeSectors.includes(sector)}
            color="#8b5cf6"
            onClick={() => toggleFilter("sectors", sector)}
          />
        ))}
      </FilterSection>
    </div>
  );
}
