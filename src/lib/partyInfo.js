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
  },
  "Yesh Atid": {
    leader: "Yair Lapid",
    founded: 2012,
    ideology: "Liberal centrism",
    wing: "center",
    seats: 24,
  },
  "Blue and White": {
    leader: "Benny Gantz",
    founded: 2019,
    ideology: "National-liberal centrism",
    wing: "center",
    seats: 8,
  },
  "Yashar": {
    leader: "Gadi Eisenkot",
    founded: 2026,
    ideology: "National centrism",
    wing: "center",
    seats: 2,
  },
  "HaMiluimnikim": {
    leader: "Yoaz Hendel",
    founded: 2026,
    ideology: "National-liberal",
    wing: "center-right",
    seats: 1,
  },
  "Religious Zionism": {
    leader: "Bezalel Smotrich",
    founded: 2019,
    ideology: "Religious Zionism, national-conservatism",
    wing: "right",
    seats: 7,
  },
  "Otzma Yehudit": {
    leader: "Itamar Ben Gvir",
    founded: 2012,
    ideology: "Kahanist, ultra-nationalist",
    wing: "right",
    seats: 6,
  },
  Shas: {
    leader: "Aryeh Deri",
    founded: 1984,
    ideology: "Ultra-Orthodox, Mizrahi traditionalism",
    wing: "right",
    seats: 11,
  },
  "United Torah Judaism": {
    leader: "Yitzchak Goldknopf",
    founded: 1992,
    ideology: "Ultra-Orthodox, Ashkenazi Haredi",
    wing: "right",
    seats: 7,
  },
  "Yisrael Beiteinu": {
    leader: "Avigdor Lieberman",
    founded: 1999,
    ideology: "Secular nationalism",
    wing: "right",
    seats: 6,
  },
  Democrats: {
    leader: "Naama Lazimi",
    founded: 2026,
    ideology: "Social democracy",
    wing: "left",
    seats: 4,
  },
  Labor: {
    leader: "—",
    founded: 1968,
    ideology: "Social democracy, Zionist left",
    wing: "left",
    seats: 0,
  },
  "Hadash-Ta'al": {
    leader: "Ayman Odeh",
    founded: 2015,
    ideology: "Arab–Jewish socialism",
    wing: "left",
    seats: 5,
  },
  "Ra'am": {
    leader: "Mansour Abbas",
    founded: 1996,
    ideology: "Islamic conservatism, pragmatism",
    wing: "arab",
    seats: 5,
  },
  Noam: {
    leader: "Avi Maoz",
    founded: 2019,
    ideology: "Ultra-conservative, religious right",
    wing: "right",
    seats: 1,
  },
  "HaYamin HaMamlakhti": {
    leader: "Gideon Sa'ar",
    founded: 2022,
    ideology: "National-liberal conservatism",
    wing: "right",
    seats: 3,
  },
  "Bennett 2026": {
    leader: "Naftali Bennett",
    founded: 2026,
    ideology: "National-liberal, pragmatic right",
    wing: "right",
    seats: 1,
  },
  "El HaDegel": {
    leader: "Matan Yafe",
    founded: 2025,
    ideology: "Religious Zionism",
    wing: "right",
    seats: 1,
  },
};

export function getPartyInfo(partyName) {
  return PARTY_INFO[partyName] || null;
}
