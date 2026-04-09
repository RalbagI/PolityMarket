// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AiAnalysisBlock from "./AiAnalysisBlock";

let mockLang = "he";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: mockLang,
      dir: () => (mockLang === "he" ? "rtl" : "ltr"),
      changeLanguage: () => {},
    },
  }),
}));

const hebrewText = [
  "## \u05E9\u05D5\u05E8\u05D4 \u05EA\u05D7\u05EA\u05D5\u05E0\u05D4",
  "\u05E0\u05EA\u05E0\u05D9\u05D4\u05D5 \u05EA\u05D7\u05EA \u05DE\u05E6\u05D5\u05E8.",
  "",
  "## \u05DE\u05D4 \u05E7\u05E8\u05D4",
  "\u2022 \u05DB\u05D5\u05EA\u05E8\u05EA \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA\u05D9\u05EA",
  "",
  "## \u05DE\u05D4 \u05D6\u05D4 \u05D0\u05D5\u05DE\u05E8",
  "\u05D4\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA \u05DE\u05EA\u05E2\u05E6\u05DE\u05EA.",
].join("\n");

const englishText = [
  "## Bottom Line",
  "Netanyahu under siege.",
  "",
  "## What Happened",
  "\u2022 Critical headline",
  "",
  "## What It Means",
  "Criticism is intensifying.",
].join("\n");

const legacyEnglishText =
  "Mock analysis: Benjamin Netanyahu received mixed coverage today. No significant PDD patterns identified.";

describe("AiAnalysisBlock", () => {
  it("renders Hebrew text when language is he", () => {
    mockLang = "he";
    render(<AiAnalysisBlock text={hebrewText} textEn={englishText} />);
    expect(
      screen.getByText(
        /\u05E0\u05EA\u05E0\u05D9\u05D4\u05D5 \u05EA\u05D7\u05EA \u05DE\u05E6\u05D5\u05E8/
      )
    ).toBeTruthy();
  });

  it("renders English text when language is en and textEn is provided", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={hebrewText} textEn={englishText} />);
    expect(screen.getByText("Netanyahu under siege.")).toBeTruthy();
  });

  it("shows not-translated message when language is en but textEn is null", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={hebrewText} textEn={null} />);
    expect(screen.getByText("detailView.aiAnalysis.notTranslated")).toBeTruthy();
  });

  it("shows not-translated message when language is en but textEn is undefined", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={hebrewText} />);
    expect(screen.getByText("detailView.aiAnalysis.notTranslated")).toBeTruthy();
  });

  it("shows not-translated message when language is en but textEn is empty string", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={hebrewText} textEn="" />);
    expect(screen.getByText("detailView.aiAnalysis.notTranslated")).toBeTruthy();
  });

  it("renders legacy English text when language is en and base text is already English", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={legacyEnglishText} textEn={null} />);
    expect(screen.getByText((content) => content.includes(legacyEnglishText))).toBeTruthy();
  });

  it("never shows Hebrew text when language is en", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={hebrewText} textEn={null} />);
    expect(
      screen.queryByText(
        /\u05E0\u05EA\u05E0\u05D9\u05D4\u05D5 \u05EA\u05D7\u05EA \u05DE\u05E6\u05D5\u05E8/
      )
    ).toBeNull();
  });

  it("renders empty state when no text provided in he", () => {
    mockLang = "he";
    render(<AiAnalysisBlock text={null} textEn={null} />);
    expect(screen.getByText("detailView.aiAnalysis.empty")).toBeTruthy();
  });

  it("renders empty state when no text provided in en", () => {
    mockLang = "en";
    render(<AiAnalysisBlock text={null} textEn={null} />);
    expect(screen.getByText("detailView.aiAnalysis.empty")).toBeTruthy();
  });
});
