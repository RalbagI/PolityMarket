// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FilterBar from "./FilterBar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

const baseProps = {
  parties: ["Likud", "Labor", "Yesh Atid"],
  wings: ["right", "left", "center"],
  sectors: ["secular", "haredi"],
  activeParties: [],
  activeWings: [],
  activeSectors: [],
  likedIds: [],
  showLikedOnly: false,
  toggleFilter: vi.fn(),
  clearFilters: vi.fn(),
  visibleCount: 120,
  totalCount: 120,
  searchTerm: "",
  setSearchTerm: vi.fn(),
};

describe("FilterBar", () => {
  it("renders wing filter section with chips", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByText("filterBar.wing")).toBeInTheDocument();
    // Chips render translated keys
    expect(screen.getByText("filterBar.wings.right")).toBeInTheDocument();
    expect(screen.getByText("filterBar.wings.left")).toBeInTheDocument();
  });

  it("calls toggleFilter when wing chip is clicked", () => {
    const toggleFilter = vi.fn();
    render(<FilterBar {...baseProps} toggleFilter={toggleFilter} />);
    fireEvent.click(screen.getByText("filterBar.wings.right"));
    expect(toggleFilter).toHaveBeenCalledWith("wings", "right");
  });

  it("shows party filter when expanded", () => {
    render(<FilterBar {...baseProps} />);
    fireEvent.click(screen.getByText("filterBar.party"));
    // Party labels are passed through t("parties.{name}")
    expect(screen.getByText("parties.Likud")).toBeInTheDocument();
    expect(screen.getByText("parties.Labor")).toBeInTheDocument();
  });

  it("shows liked button only when there are liked politicians", () => {
    const { rerender } = render(<FilterBar {...baseProps} likedIds={[]} />);
    expect(screen.queryByText(/filterBar\.liked/)).not.toBeInTheDocument();

    rerender(<FilterBar {...baseProps} likedIds={["pol-1"]} />);
    expect(screen.getByText(/filterBar\.liked/)).toBeInTheDocument();
  });

  it("calls clearFilters when clear button is clicked", () => {
    const clearFilters = vi.fn();
    render(<FilterBar {...baseProps} activeWings={["right"]} clearFilters={clearFilters} />);
    const clearBtn = screen.getByText("filterBar.clearFilters");
    fireEvent.click(clearBtn);
    expect(clearFilters).toHaveBeenCalled();
  });

  it("shows visible/total count", () => {
    render(<FilterBar {...baseProps} visibleCount={50} totalCount={120} />);
    expect(screen.getByText("50/120")).toBeInTheDocument();
  });

  it("calls setSearchTerm when typing in the search input", () => {
    const setSearchTerm = vi.fn();
    render(<FilterBar {...baseProps} setSearchTerm={setSearchTerm} />);

    fireEvent.change(screen.getByPlaceholderText("filterBar.search.placeholder"), {
      target: { value: "ליכוד" },
    });
    expect(setSearchTerm).toHaveBeenCalledWith("ליכוד");
  });

  it("shows and uses search clear button when search is active", () => {
    const setSearchTerm = vi.fn();
    render(<FilterBar {...baseProps} searchTerm="ליכוד" setSearchTerm={setSearchTerm} />);

    fireEvent.click(screen.getByLabelText("filterBar.search.clear"));
    expect(setSearchTerm).toHaveBeenCalledWith("");
  });
});
