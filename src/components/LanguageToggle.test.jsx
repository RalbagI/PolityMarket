// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageToggle from "./LanguageToggle";

const changeLanguageMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", changeLanguage: changeLanguageMock },
  }),
}));

describe("LanguageToggle", () => {
  it("renders EN label when language is Hebrew", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveTextContent("EN");
  });

  it("has correct aria-label", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "languageToggle.switchToEnglish"
    );
  });

  it("calls changeLanguage on click", () => {
    render(<LanguageToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(changeLanguageMock).toHaveBeenCalledWith("en");
  });
});
