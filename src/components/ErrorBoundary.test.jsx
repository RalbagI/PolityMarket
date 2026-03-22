// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
  withTranslation: () => (Component) => {
    // HOC injects t as prop
    return function Wrapped(props) {
      return <Component {...props} t={(key) => key} />;
    };
  },
}));

function ThrowingChild({ shouldThrow }) {
  if (shouldThrow) throw new Error("Test error");
  return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
  // Suppress React error boundary console.error
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders error UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    // Should show error state, not the child
    expect(screen.queryByText("Child content")).not.toBeInTheDocument();
  });
});
