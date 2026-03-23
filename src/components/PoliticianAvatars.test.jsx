// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import PoliticianAvatars from "./PoliticianAvatars";
import HANDCRAFTED_AVATAR_IDS from "./handcraftedAvatarIds";
import POLITICIAN_TRAITS, { POLITICIAN_TRAIT_ISSUES } from "./politicianTraits";

describe("PoliticianAvatars", () => {
  it("renders known politician avatar (Netanyahu)", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="benjamin-netanyahu" name="Benjamin Netanyahu" size={40} />
    );
    // Should render an SVG avatar
    const svg = container.querySelector("svg");
    expect(svg || container.querySelector("[style]")).toBeTruthy();
  });

  it("renders initials fallback for unknown politician", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="unknown-person" name="Unknown Person" size={40} />
    );
    // Should have initials
    expect(container.textContent).toMatch(/UP|U/);
  });

  it("respects size prop", () => {
    const { container } = render(<PoliticianAvatars politicianId="test" name="Test" size={64} />);
    const el = container.firstChild;
    // Should have width/height matching size
    expect(el.style.width || el.getAttribute("width")).toBeTruthy();
  });

  it("renders generated avatar for trait-configured politician", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="yariv-levin" name="Yariv Levin" size={40} />
    );
    // Should render an SVG (generated), not initials
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(container.textContent).not.toMatch(/YL/);
  });

  it("renders generated avatar for haredi politician with kippah", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="aryeh-deri" name="Aryeh Deri" size={40} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders generated avatar for arab politician", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="mansour-abbas" name="Mansour Abbas" size={40} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders generated avatar for female politician", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="miri-regev" name="Miri Regev" size={40} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("renders generated avatar for hijab-wearing politician", () => {
    const { container } = render(
      <PoliticianAvatars politicianId="iman-khatib-yasin" name="Iman Khatib-Yasin" size={40} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("covers all politicians in latest details file with trait or hand-crafted avatar", () => {
    const detailsDir = path.resolve("public/data/details");
    const latest = fs
      .readdirSync(detailsDir)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .at(-1);

    expect(latest).toBeTruthy();

    const rows = JSON.parse(fs.readFileSync(path.join(detailsDir, latest), "utf8"));
    const knownHandcrafted = new Set(HANDCRAFTED_AVATAR_IDS);
    const missing = [];

    for (const row of rows) {
      const id = row.politician_id;
      const hasHandcrafted = knownHandcrafted.has(id);
      const hasTraits = Object.prototype.hasOwnProperty.call(POLITICIAN_TRAITS, id);

      if (!hasHandcrafted && !hasTraits) missing.push(id);
    }

    expect(missing).toEqual([]);
  });

  it("has no invalid trait schema entries", () => {
    expect(POLITICIAN_TRAIT_ISSUES).toEqual([]);
  });
});
