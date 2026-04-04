import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Brain,
  BarChart3,
  Shield,
  AlertTriangle,
  Cpu,
  Database,
  CheckCircle,
  Eye,
  Scale,
  FileText,
  TrendingUp,
} from "lucide-react";
import useFocusTrap from "../lib/useFocusTrap";

function Section({ icon: Icon, iconColor, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Paragraph({ text }) {
  return <p className="text-sm text-gray-300 leading-relaxed">{text}</p>;
}

function BulletList({ items }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="text-sm text-gray-400 flex gap-2 leading-relaxed">
          <span className="text-gray-600 mt-1 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LegalSection({ title, text }) {
  return (
    <div className="border-b border-gray-800/50 pb-4 last:border-0 last:pb-0">
      <h4 className="text-sm font-semibold text-gray-200 mb-1.5">{title}</h4>
      <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
    </div>
  );
}

export default function MethodologyModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const [tab, setTab] = useState("methodology");
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="methodology-title"
          className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        >
          {/* Header with tabs */}
          <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
            <div className="px-6 py-4 flex items-center justify-between">
              <h2 id="methodology-title" className="text-lg font-bold text-white">
                {tab === "methodology" ? t("methodology.title") : t("legal.title")}
              </h2>
              <button
                onClick={onClose}
                aria-label={t("slidePanel.closeButton.ariaLabel")}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Tab bar */}
            <div className="flex px-6 gap-1">
              <button
                onClick={() => setTab("methodology")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === "methodology"
                    ? "bg-gray-800 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t("methodology.title")}
              </button>
              <button
                onClick={() => setTab("legal")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === "legal" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t("legal.title")}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-8">
            {tab === "methodology" ? (
              <>
                {/* How It Works */}
                <Section
                  icon={Brain}
                  iconColor="text-indigo-400"
                  title={t("methodology.howItWorks.title")}
                >
                  <Paragraph text={t("methodology.howItWorks.description")} />
                  <Paragraph text={t("methodology.howItWorks.description2")} />
                </Section>

                {/* Scoring */}
                <Section
                  icon={BarChart3}
                  iconColor="text-violet-400"
                  title={t("methodology.scoring.title")}
                >
                  <Paragraph text={t("methodology.scoring.description")} />
                  <div className="bg-gray-800/50 rounded-xl p-4 mt-3 space-y-2.5">
                    {[
                      { key: "publicSentiment", color: "text-indigo-400" },
                      { key: "parliamentaryActivity", color: "text-violet-400" },
                      { key: "mediaCredibility", color: "text-cyan-400" },
                      { key: "transparencyEthics", color: "text-emerald-400" },
                      { key: "fieldActivity", color: "text-amber-400" },
                      { key: "satireCulturalImpact", color: "text-rose-400" },
                      { key: "legislativeQuality", color: "text-purple-400" },
                      { key: "flipflopIndex", color: "text-teal-400" },
                    ].map(({ key, color }) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300 font-medium">
                            {t(`methodology.dimensions.${key}`)}
                          </span>
                          <span className={`${color} font-bold`}>
                            {t(`methodology.dimensions.${key}Weight`)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t(`methodology.dimensions.${key}Desc`)}
                        </p>
                      </div>
                    ))}
                    <div className="border-t border-gray-700/50 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400 font-medium">
                          {t("methodology.dimensions.agendaBonus")}
                        </span>
                        <span className="text-gray-500 text-xs font-medium">±0.5 pt</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t("methodology.dimensions.agendaBonusDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mt-3">
                    <p className="text-xs text-indigo-300 font-mono text-center whitespace-pre-line">
                      {t("methodology.scoring.formula")}
                    </p>
                  </div>
                </Section>

                {/* Market display layer */}
                <Section
                  icon={TrendingUp}
                  iconColor="text-amber-400"
                  title={t("methodology.marketLayer.title")}
                >
                  <Paragraph text={t("methodology.marketLayer.description")} />
                  <div className="bg-gray-800/50 rounded-xl p-4 mt-3 space-y-2.5">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 font-medium">
                          {t("methodology.marketLayer.rawTitle")}
                        </span>
                        <span className="text-violet-300 font-bold">
                          {t("methodology.marketLayer.rawRange")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t("methodology.marketLayer.rawDescription")}
                      </p>
                    </div>
                    <div className="border-t border-gray-700/50 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 font-medium">
                          {t("methodology.marketLayer.displayTitle")}
                        </span>
                        <span className="text-amber-300 font-bold">
                          {t("methodology.marketLayer.displayRange")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t("methodology.marketLayer.displayDescription")}
                      </p>
                    </div>
                  </div>
                  <BulletList
                    items={[
                      t("methodology.marketLayer.percentile"),
                      t("methodology.marketLayer.tiers"),
                      t("methodology.marketLayer.delta"),
                      t("methodology.marketLayer.stability"),
                    ]}
                  />
                </Section>

                {/* Display Options — Size & Color explanation */}
                <Section
                  icon={Eye}
                  iconColor="text-emerald-400"
                  title={t("methodology.visualization.title")}
                >
                  <Paragraph text={t("methodology.visualization.description")} />
                  <BulletList
                    items={[
                      t("methodology.visualization.size"),
                      t("methodology.visualization.color"),
                      t("methodology.visualization.interaction"),
                    ]}
                  />

                  {/* Display options: נפח and ציון */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-200 mb-2">
                      {t("methodology.visualization.displayOptions")}
                    </h4>
                    <Paragraph text={t("methodology.visualization.displayDescription")} />

                    <div className="bg-gray-800/50 rounded-xl p-4 mt-3 space-y-4">
                      <div>
                        <h5 className="text-sm font-medium text-emerald-400 mb-1.5">
                          {t("methodology.visualization.sizeByTitle")}
                        </h5>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium shrink-0">
                              {t("treemap.options.mediaVolume")}
                            </span>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {t("methodology.visualization.sizeByVolume")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded font-medium shrink-0">
                              {t("treemap.options.score")}
                            </span>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {t("methodology.visualization.sizeByScore")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-700/50 pt-3">
                        <h5 className="text-sm font-medium text-emerald-400 mb-1.5">
                          {t("methodology.visualization.colorByTitle")}
                        </h5>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded font-medium shrink-0">
                              {t("treemap.options.score")}
                            </span>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {t("methodology.visualization.colorByScore")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium shrink-0">
                              {t("treemap.options.mediaVolume")}
                            </span>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              {t("methodology.visualization.colorByVolume")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* AI Analysis */}
                <Section
                  icon={Cpu}
                  iconColor="text-rose-400"
                  title={t("methodology.aiAnalysis.title")}
                >
                  <Paragraph text={t("methodology.aiAnalysis.description")} />
                  <BulletList
                    items={[
                      t("methodology.aiAnalysis.sarcasm"),
                      t("methodology.aiAnalysis.pdd"),
                      t("methodology.aiAnalysis.nuance"),
                    ]}
                  />
                </Section>

                {/* Data Sources */}
                <Section
                  icon={Database}
                  iconColor="text-cyan-400"
                  title={t("methodology.dataSources.title")}
                >
                  <Paragraph text={t("methodology.dataSources.description")} />
                  <BulletList
                    items={[
                      t("methodology.dataSources.hebrew"),
                      t("methodology.dataSources.english"),
                      t("methodology.dataSources.social"),
                      t("methodology.dataSources.frequency"),
                    ]}
                  />
                </Section>

                {/* Quality Control */}
                <Section
                  icon={CheckCircle}
                  iconColor="text-green-400"
                  title={t("methodology.qualityControl.title")}
                >
                  <Paragraph text={t("methodology.qualityControl.description")} />
                  <BulletList
                    items={[
                      t("methodology.qualityControl.validation"),
                      t("methodology.qualityControl.drift"),
                      t("methodology.qualityControl.retry"),
                      t("methodology.qualityControl.deterministic"),
                    ]}
                  />
                </Section>
              </>
            ) : (
              <>
                {/* Legal Disclaimer sections */}
                <Section icon={Scale} iconColor="text-amber-400" title={t("legal.title")}>
                  <div className="space-y-4">
                    <LegalSection title={t("legal.general.title")} text={t("legal.general.text")} />
                    <LegalSection
                      title={t("legal.accuracy.title")}
                      text={t("legal.accuracy.text")}
                    />
                    <LegalSection
                      title={t("legal.aiLimitations.title")}
                      text={t("legal.aiLimitations.text")}
                    />
                    <LegalSection
                      title={t("legal.noEndorsement.title")}
                      text={t("legal.noEndorsement.text")}
                    />
                    <LegalSection
                      title={t("legal.dataSources.title")}
                      text={t("legal.dataSources.text")}
                    />
                    <LegalSection title={t("legal.privacy.title")} text={t("legal.privacy.text")} />
                    <LegalSection
                      title={t("legal.liability.title")}
                      text={t("legal.liability.text")}
                    />
                    <LegalSection title={t("legal.changes.title")} text={t("legal.changes.text")} />
                  </div>
                </Section>

                {/* Warning box */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      {t("legal.liability.text")}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
