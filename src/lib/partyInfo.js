/**
 * Static metadata for Israeli political parties.
 * Used in PartyDetailView to show background info.
 */
const PARTY_INFO = {
  Likud: {
    leader: "Benjamin Netanyahu",
    founded: 1973,
    ideology: "National-liberal conservatism",
    wing: "right",
    seats: 32,
    status: "coalition",
    description:
      "Israel's dominant right-wing party, leading every coalition since 2009. Built on Begin's revisionist Zionism, today it blends free-market economics with security hawkishness and populist appeal. Under Netanyahu it absorbed Sa'ar and Elkin back from HaYamin HaMamlakhti ahead of the 2026 cycle.",
    keyPositions: [
      "Oppose Palestinian statehood",
      "Judicial reform / reduce Supreme Court power",
      "Free-market economic policy",
      "Maintain settlement expansion",
    ],
  },
  "Yesh Atid": {
    leader: "Yair Lapid",
    founded: 2012,
    ideology: "Liberal centrism",
    wing: "center",
    seats: 24,
    status: "opposition",
    description:
      "The largest opposition party, founded by journalist Yair Lapid as a centrist alternative. Focuses on middle-class economics, secular civic identity, and a rules-based foreign policy. Served as the senior coalition partner in 2021–2022 with Lapid as PM.",
    keyPositions: [
      "Two-state solution framework",
      "Reduce cost of living",
      "Mandatory national service for all",
      "Protect judicial independence",
    ],
  },
  "Blue and White": {
    leader: "Benny Gantz",
    founded: 2019,
    ideology: "National-liberal centrism",
    wing: "center",
    seats: 8,
    status: "opposition",
    description:
      "Re-formed in 2026 after the dissolution of National Unity, led by former IDF Chief of Staff Benny Gantz. Positions itself as a security-first centrist alternative to both Likud and Yesh Atid, drawing on Gantz's military credentials.",
    keyPositions: [
      "Security-first policy on Iran and Gaza",
      "National unity government",
      "Moderate judicial reform",
      "Strengthen IDF and defense establishment",
    ],
  },
  Yashar: {
    leader: "Gadi Eisenkot",
    founded: 2026,
    ideology: "National centrism",
    wing: "center",
    seats: 2,
    status: "opposition",
    description:
      "A new party formed in 2026 by former IDF Chief of Staff Gadi Eisenkot and MK Matan Kahana after splitting from National Unity. Emphasizes military professionalism and centrist pragmatism over partisan politics.",
    keyPositions: [
      "Professional security leadership",
      "Hostage deal priority",
      "National service reform",
      "Evidence-based policy making",
    ],
  },
  HaMiluimnikim: {
    leader: "Yoaz Hendel",
    founded: 2026,
    ideology: "National-liberal",
    wing: "center",
    seats: 1,
    status: "opposition",
    description:
      "A single-MK party formed by Yoaz Hendel in 2026 after leaving National Unity. Represents the reservist (miluimnik) ethos — centrist on economics, hawkish on security, and critical of both the far-right coalition and the traditional opposition.",
    keyPositions: [
      "Reservist rights and recognition",
      "Equal burden of service",
      "Center-right security policy",
      "Government accountability",
    ],
  },
  "Religious Zionism": {
    leader: "Bezalel Smotrich",
    founded: 2019,
    ideology: "Religious Zionism, national-conservatism",
    wing: "right",
    seats: 7,
    status: "coalition",
    description:
      "A hard-right religious-nationalist party led by Finance Minister Smotrich. Advocates for annexation of the West Bank, Torah-based governance, and settlement expansion. A key coalition partner with significant influence over fiscal and West Bank policy.",
    keyPositions: [
      "West Bank annexation",
      "Expand settlements",
      "Torah values in legislation",
      "Oppose Palestinian Authority",
    ],
  },
  "Otzma Yehudit": {
    leader: "Itamar Ben Gvir",
    founded: 2012,
    ideology: "Kahanist, ultra-nationalist",
    wing: "right",
    seats: 6,
    status: "coalition",
    description:
      "An ultra-nationalist party led by National Security Minister Ben Gvir. Rooted in the Kahanist movement, it has mainstreamed into coalition politics since 2022. Advocates aggressive policing, Jewish sovereignty on the Temple Mount, and hardline security measures.",
    keyPositions: [
      "Jewish sovereignty on Temple Mount",
      "Death penalty for terrorists",
      "Aggressive law enforcement",
      "Oppose any Palestinian state",
    ],
  },
  Shas: {
    leader: "Aryeh Deri",
    founded: 1984,
    ideology: "Ultra-Orthodox, Mizrahi traditionalism",
    wing: "right",
    seats: 11,
    status: "coalition",
    description:
      "The Mizrahi ultra-Orthodox party, one of the largest Haredi factions. Founded by Rabbi Ovadia Yosef, it blends religious conservatism with social welfare advocacy for Israel's Mizrahi working class. A perennial coalition kingmaker.",
    keyPositions: [
      "Yeshiva funding and draft exemptions",
      "Social welfare expansion",
      "Religious status quo in public life",
      "Mizrahi cultural recognition",
    ],
  },
  "United Torah Judaism": {
    leader: "Yitzchak Goldknopf",
    founded: 1992,
    ideology: "Ultra-Orthodox, Ashkenazi Haredi",
    wing: "right",
    seats: 7,
    status: "coalition",
    description:
      "The Ashkenazi ultra-Orthodox alliance, uniting Agudat Yisrael and Degel HaTorah. Focused almost exclusively on preserving the Haredi way of life — yeshiva study, draft exemptions, and religious education funding. A reliable coalition partner for right-wing governments.",
    keyPositions: [
      "Full yeshiva draft exemption",
      "Haredi education autonomy",
      "Shabbat public observance",
      "Housing for large families",
    ],
  },
  "Yisrael Beiteinu": {
    leader: "Avigdor Lieberman",
    founded: 1999,
    ideology: "Secular nationalism",
    wing: "right",
    seats: 6,
    status: "opposition",
    description:
      "A secular-nationalist party with strong support among Russian-speaking Israelis. Under Lieberman it combines security hawkishness with fierce secularism, opposing both Haredi influence and Arab political power. Has been in opposition since refusing to sit with ultra-Orthodox parties.",
    keyPositions: [
      "Mandatory service for all — no exemptions",
      "Civil marriage legislation",
      "Tough security and border policy",
      "End ultra-Orthodox coalition leverage",
    ],
  },
  Democrats: {
    leader: "Yair Golan",
    founded: 2024,
    ideology: "Social democracy",
    wing: "left",
    seats: 4,
    status: "opposition",
    description:
      "Founded in 2024 as a merger of Labor and Meretz, led by former MK and IDF deputy chief Yair Golan. Joined by Labor defectors Lazimi, Kariv, and Rayten. Aims to revive social-democratic politics with a focus on equality, LGBTQ+ rights, and peace advocacy.",
    keyPositions: [
      "Two-state solution",
      "LGBTQ+ and civil rights",
      "Affordable housing and welfare",
      "Separation of religion and state",
    ],
  },
  Labor: {
    leader: "—",
    founded: 1968,
    ideology: "Social democracy, Zionist left",
    wing: "left",
    seats: 0,
    status: "extra-parliamentary",
    description:
      "Israel's historic founding party, governing from 1948 to 1977 and intermittently since. After Merav Michaeli's retirement and the departure of key MKs to the Democrats, the party is now extra-parliamentary and faces an existential crisis heading into the next election.",
    keyPositions: [
      "Two-state solution",
      "Workers' rights and social safety net",
      "Secular democratic state",
      "Peace process engagement",
    ],
  },
  "Hadash-Ta'al": {
    leader: "Ayman Odeh",
    founded: 2015,
    ideology: "Arab–Jewish socialism",
    wing: "left",
    seats: 5,
    status: "opposition",
    description:
      "A joint list of the Jewish-Arab communist Hadash and the Arab-nationalist Ta'al. Represents Arab citizens alongside Jewish left activists. Advocates for equality, ending the occupation, and full civil rights for Israel's Arab minority.",
    keyPositions: [
      "End the occupation",
      "Full equality for Arab citizens",
      "Workers' rights and social justice",
      "Anti-privatization",
    ],
  },
  "Ra'am": {
    leader: "Mansour Abbas",
    founded: 1996,
    ideology: "Islamic conservatism, pragmatism",
    wing: "arab",
    seats: 5,
    status: "opposition",
    description:
      "The southern branch of the Islamic Movement's political party. Made history in 2021 as the first Arab party to join a governing coalition, prioritizing pragmatic gains — budgets, infrastructure, and crime-fighting — for Arab communities over ideological purity.",
    keyPositions: [
      "Arab community infrastructure investment",
      "Fight crime in Arab towns",
      "Pragmatic coalition participation",
      "Bedouin settlement recognition",
    ],
  },
  Noam: {
    leader: "Avi Maoz",
    founded: 2019,
    ideology: "Ultra-conservative, religious right",
    wing: "right",
    seats: 1,
    status: "coalition",
    description:
      "A single-MK ultra-conservative party focused on opposing LGBTQ+ rights, liberal education curricula, and what it calls 'Western cultural erosion.' Briefly held a deputy-minister role in the current coalition before internal friction.",
    keyPositions: [
      "Oppose LGBTQ+ legislation",
      "Traditional family values in education",
      "Jewish identity in public sphere",
      "Oppose Reform Judaism recognition",
    ],
  },
  "HaYamin HaMamlakhti": {
    leader: "Sharren Haskel",
    founded: 2022,
    ideology: "National-liberal conservatism",
    wing: "right",
    seats: 3,
    status: "coalition",
    description:
      "Originally founded by Gideon Sa'ar after splitting from Likud. After Sa'ar and Elkin returned to Likud in 2025, the remaining MKs — Sharren Haskel, Michel Buskila, and Akram Hasson — continue as a coalition faction with a law-and-order, national-liberal platform.",
    keyPositions: [
      "Rule of law and governance reform",
      "Security hawkishness",
      "Free-market economics",
      "Moderate judicial reform",
    ],
  },
  "Bennett 2026": {
    leader: "Naftali Bennett",
    founded: 2026,
    ideology: "National-liberal, pragmatic right",
    wing: "right",
    seats: 1,
    status: "extra-parliamentary",
    description:
      "Former PM Naftali Bennett's comeback vehicle, launched in 2026 after years out of politics. Positioning himself as a pragmatic right-wing alternative to Netanyahu, drawing on his tech-sector background and brief tenure as PM in 2021–2022.",
    keyPositions: [
      "Tech-driven economic growth",
      "Pragmatic security policy",
      "Right-wing alternative to Netanyahu",
      "Innovation and governance reform",
    ],
  },
  "El HaDegel": {
    leader: "Matan Yafe",
    founded: 2025,
    ideology: "Religious Zionism",
    wing: "right",
    seats: 1,
    status: "extra-parliamentary",
    description:
      "A small religious-Zionist faction led by Matan Yafe, positioning itself between mainstream Religious Zionism and the Kahanist right. Focuses on settlement advocacy and religious-nationalist values.",
    keyPositions: [
      "Settlement expansion",
      "Religious-Zionist education",
      "Land of Israel sovereignty",
      "National religious identity",
    ],
  },
};

export function getPartyInfo(partyName) {
  return PARTY_INFO[partyName] || null;
}
