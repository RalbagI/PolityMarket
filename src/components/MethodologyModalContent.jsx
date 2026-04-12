import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle,
  Cpu,
  Database,
  Eye,
  Layers,
  Scale,
  Sliders,
  TrendingUp,
} from "lucide-react";

function Section({ icon: Icon, iconColor, title, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Paragraph({ text }) {
  return <p className="text-sm leading-relaxed text-gray-300">{text}</p>;
}

function BulletList({ items }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed text-gray-400">
          <span className="mt-1 shrink-0 text-gray-600">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryCard({ eyebrow, title, text, accentClass }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClass}`}>
        {eyebrow}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-400">{text}</p>
    </div>
  );
}

function LegalSection({ title, text }) {
  return (
    <div className="border-b border-gray-800/50 pb-4 last:border-0 last:pb-0">
      <h4 className="mb-1.5 text-sm font-semibold text-gray-200">{title}</h4>
      <p className="text-sm leading-relaxed text-gray-400">{text}</p>
    </div>
  );
}

const SUMMARY_CARDS = [
  { key: "overview", accentClass: "text-indigo-300" },
  { key: "mediaClimate", accentClass: "text-emerald-300" },
  { key: "consensusProxy", accentClass: "text-amber-300" },
];

const DIMENSIONS = [
  { key: "publicSentiment", color: "text-indigo-400" },
  { key: "parliamentaryActivity", color: "text-violet-400" },
  { key: "mediaCredibility", color: "text-cyan-400" },
  { key: "transparencyEthics", color: "text-emerald-400" },
  { key: "fieldActivity", color: "text-amber-400" },
  { key: "satireCulturalImpact", color: "text-rose-400" },
  { key: "legislativeQuality", color: "text-purple-400" },
  { key: "flipflopIndex", color: "text-teal-400" },
];

const LEGAL_KEYS = [
  "general",
  "accuracy",
  "aiLimitations",
  "noEndorsement",
  "dataSources",
  "privacy",
  "liability",
  "changes",
];

const LENS_CARDS = [
  {
    titleKey: "methodology.lenses.momentumTitle",
    descKey: "methodology.lenses.momentumDescription",
    titleClass: "text-indigo-300",
  },
  {
    titleKey: "methodology.lenses.marketTitle",
    descKey: "methodology.lenses.marketDescription",
    titleClass: "text-violet-300",
    topBorder: true,
  },
  {
    titleKey: "methodology.lenses.yourScoreTitle",
    descKey: "methodology.lenses.yourScoreDescription",
    titleClass: "text-emerald-300",
    topBorder: true,
  },
];

const PERSONALIZATION_ITEMS = [
  {
    titleKey: "methodology.personalization.heroTitle",
    descKey: "methodology.personalization.heroDescription",
    titleClass: "text-amber-200",
  },
  {
    titleKey: "methodology.personalization.weightsTitle",
    descKey: "methodology.personalization.weightsDescription",
    titleClass: "text-emerald-200",
    topBorder: true,
  },
];

const DISPLAY_OPTION_ROWS = [
  {
    titleKey: "methodology.visualization.sizeByTitle",
    rows: [
      {
        badgeKey: "treemap.options.mediaVolume",
        badgeClass: "bg-emerald-500/20 text-emerald-300",
        textKey: "methodology.visualization.sizeByVolume",
      },
      {
        badgeKey: "treemap.options.score",
        badgeClass: "bg-violet-500/20 text-violet-300",
        textKey: "methodology.visualization.sizeByScore",
      },
    ],
  },
  {
    titleKey: "methodology.visualization.colorByTitle",
    borderTop: true,
    rows: [
      {
        badgeKey: "treemap.options.score",
        badgeClass: "bg-violet-500/20 text-violet-300",
        textKey: "methodology.visualization.colorByScore",
      },
      {
        badgeKey: "treemap.options.mediaVolume",
        badgeClass: "bg-emerald-500/20 text-emerald-300",
        textKey: "methodology.visualization.colorByVolume",
      },
    ],
  },
];

export function MethodologyContent({ t }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {SUMMARY_CARDS.map(({ key, accentClass }) => (
          <SummaryCard
            key={key}
            eyebrow={t(`methodology.quickStart.${key}.eyebrow`)}
            title={t(`methodology.quickStart.${key}.title`)}
            text={t(`methodology.quickStart.${key}.text`)}
            accentClass={accentClass}
          />
        ))}
      </div>

      <Section icon={Brain} iconColor="text-indigo-400" title={t("methodology.howItWorks.title")}>
        <Paragraph text={t("methodology.howItWorks.description")} />
        <Paragraph text={t("methodology.howItWorks.description2")} />
      </Section>

      <Section icon={BarChart3} iconColor="text-violet-400" title={t("methodology.scoring.title")}>
        <Paragraph text={t("methodology.scoring.description")} />
        <div className="mt-3 space-y-2.5 rounded-xl bg-gray-800/50 p-4">
          {DIMENSIONS.map(({ key, color }) => (
            <div key={key}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-300">
                  {t(`methodology.dimensions.${key}`)}
                </span>
                <span className={`${color} font-bold`}>
                  {t(`methodology.dimensions.${key}Weight`)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {t(`methodology.dimensions.${key}Desc`)}
              </p>
            </div>
          ))}
          <div className="border-t border-gray-700/50 pt-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-400">
                {t("methodology.dimensions.agendaBonus")}
              </span>
              <span className="text-xs font-medium text-gray-500">±0.5 pt</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {t("methodology.dimensions.agendaBonusDesc")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {["step1", "step2", "step3"].map((stepKey, index) => (
            <div
              key={stepKey}
              className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-3"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {t("methodology.scoring.stepLabel", { number: index + 1 })}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                {t(`methodology.scoring.${stepKey}`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
          <p className="text-sm leading-relaxed text-indigo-200">
            {t("methodology.scoring.formula")}
          </p>
        </div>
      </Section>

      <Section
        icon={TrendingUp}
        iconColor="text-amber-400"
        title={t("methodology.marketLayer.title")}
      >
        <Paragraph text={t("methodology.marketLayer.description")} />
        <div className="mt-3 space-y-2.5 rounded-xl bg-gray-800/50 p-4">
          {[
            {
              titleKey: "methodology.marketLayer.rawTitle",
              rangeKey: "methodology.marketLayer.rawRange",
              descKey: "methodology.marketLayer.rawDescription",
              rangeClass: "text-violet-300",
            },
            {
              titleKey: "methodology.marketLayer.displayTitle",
              rangeKey: "methodology.marketLayer.displayRange",
              descKey: "methodology.marketLayer.displayDescription",
              rangeClass: "text-amber-300",
              topBorder: true,
            },
          ].map(({ titleKey, rangeKey, descKey, rangeClass, topBorder }) => (
            <div key={titleKey} className={topBorder ? "border-t border-gray-700/50 pt-2" : ""}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-300">{t(titleKey)}</span>
                <span className={`font-bold ${rangeClass}`}>{t(rangeKey)}</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{t(descKey)}</p>
            </div>
          ))}
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

      <Section icon={Layers} iconColor="text-sky-400" title={t("methodology.lenses.title")}>
        <Paragraph text={t("methodology.lenses.description")} />
        <div className="mt-3 space-y-2.5 rounded-xl bg-gray-800/50 p-4">
          {LENS_CARDS.map(({ titleKey, descKey, titleClass, topBorder }) => (
            <div key={titleKey} className={topBorder ? "border-t border-gray-700/50 pt-2" : ""}>
              <div className={`text-sm font-semibold ${titleClass}`}>{t(titleKey)}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{t(descKey)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
          <p className="text-sm leading-relaxed text-indigo-200">
            {t("methodology.lenses.momentumFormula")}
          </p>
        </div>
      </Section>

      <Section icon={Eye} iconColor="text-emerald-400" title={t("methodology.visualization.title")}>
        <Paragraph text={t("methodology.visualization.description")} />
        <BulletList
          items={[
            t("methodology.visualization.size"),
            t("methodology.visualization.color"),
            t("methodology.visualization.sparkline"),
            t("methodology.visualization.pulse"),
            t("methodology.visualization.interaction"),
          ]}
        />

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-200">
            {t("methodology.visualization.displayOptions")}
          </h4>
          <Paragraph text={t("methodology.visualization.displayDescription")} />

          <div className="mt-3 space-y-4 rounded-xl bg-gray-800/50 p-4">
            {DISPLAY_OPTION_ROWS.map(({ titleKey, borderTop, rows }) => (
              <div key={titleKey} className={borderTop ? "border-t border-gray-700/50 pt-3" : ""}>
                <h5 className="mb-1.5 text-sm font-medium text-emerald-400">{t(titleKey)}</h5>
                <div className="space-y-2">
                  {rows.map(({ badgeKey, badgeClass, textKey }) => (
                    <div key={textKey} className="flex gap-2">
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                      >
                        {t(badgeKey)}
                      </span>
                      <p className="text-xs leading-relaxed text-gray-400">{t(textKey)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        icon={Sliders}
        iconColor="text-amber-300"
        title={t("methodology.personalization.title")}
      >
        <Paragraph text={t("methodology.personalization.description")} />
        <div className="mt-3 space-y-2.5 rounded-xl bg-gray-800/50 p-4">
          {PERSONALIZATION_ITEMS.map(({ titleKey, descKey, titleClass, topBorder }) => (
            <div key={titleKey} className={topBorder ? "border-t border-gray-700/50 pt-2" : ""}>
              <div className={`text-sm font-semibold ${titleClass}`}>{t(titleKey)}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{t(descKey)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
          <p className="text-sm leading-relaxed text-emerald-200">
            {t("methodology.personalization.weightsMath")}
          </p>
        </div>
      </Section>

      <Section icon={Cpu} iconColor="text-rose-400" title={t("methodology.aiAnalysis.title")}>
        <Paragraph text={t("methodology.aiAnalysis.description")} />
        <BulletList
          items={[
            t("methodology.aiAnalysis.sarcasm"),
            t("methodology.aiAnalysis.pdd"),
            t("methodology.aiAnalysis.nuance"),
          ]}
        />
      </Section>

      <Section icon={Database} iconColor="text-cyan-400" title={t("methodology.dataSources.title")}>
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
  );
}

export function LegalContent({ t }) {
  return (
    <>
      <Section icon={Scale} iconColor="text-amber-400" title={t("legal.title")}>
        <div className="space-y-4">
          {LEGAL_KEYS.map((key) => (
            <LegalSection key={key} title={t(`legal.${key}.title`)} text={t(`legal.${key}.text`)} />
          ))}
        </div>
      </Section>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-200/80">{t("legal.liability.text")}</p>
        </div>
      </div>
    </>
  );
}
