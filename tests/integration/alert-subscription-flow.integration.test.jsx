// @vitest-environment jsdom

/**
 * Integration tests for the full alert subscription flow:
 * bell icon click → modal opens → form fill → subscribe API → success/error
 *
 * These tests verify the contract between components rather than
 * testing each component in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts = {}) => {
      const dict = {
        "alerts.toggleOn": "Enable alerts",
        "alerts.toggleOff": "Disable alerts",
        "alerts.subscribeTitle": "Subscribe to Alerts",
        "alerts.subscribeDescription": "Get notified when scores change",
        "alerts.emailPlaceholder": "Email address",
        "alerts.submitButton": "Subscribe",
        "alerts.subscribedPoliticians": "Watched politicians",
        "alerts.selectAll": "Select all",
        "alerts.deselectAll": "Deselect all",
        "alerts.emailRequired": "Email required",
        "alerts.emailInvalid": "Invalid email",
        "alerts.subscribeSuccess": "Subscribed!",
        "alerts.subscribeFailed": "Failed to subscribe",
        "alerts.subscriptionExists": "Already subscribed, check email",
        "alerts.subscriptionExistsEmailFailed": "Already subscribed, email failed",
        "alerts.verifyPrompt": "Check your email to verify",
        "alerts.advanced": "Advanced",
        "alerts.webhookPlaceholder": "Webhook URL",
        "detailView.like": "Like",
        "detailView.unlike": "Unlike",
      };
      return dict[key] || opts.defaultValue || key;
    },
  }),
}));

vi.mock("../../src/lib/localize", () => ({
  localizeName: (_t, name) => name,
  localizeParty: (_t, party) => party,
}));

vi.mock("../../src/lib/useFocusTrap", () => ({
  default: () => {},
}));

// ── Helpers ────────────────────────────────────────────────────────────

const POLITICIANS = [
  { politician_id: "benjamin-netanyahu", name: "Benjamin Netanyahu", party: "Likud", overall_score: 5.0, media_volume: 5 },
  { politician_id: "yair-lapid", name: "Yair Lapid", party: "Yesh Atid", overall_score: 6.0, media_volume: 3 },
];

function makeTodayDetail(overrides = {}) {
  return [{
    politician_id: "benjamin-netanyahu",
    name: "Benjamin Netanyahu",
    party: "Likud",
    overall_score: 5.2,
    media_volume: 5,
    hostility_level: 0.5,
    policy_approval: 0.2,
    media_amplification: 0.6,
    news_sentiment: 6,
    dim_public_sentiment: 5.0,
    dim_parliamentary_activity: 4.0,
    dim_media_credibility: 6.0,
    dim_transparency_ethics: 3.5,
    dim_field_activity: 4.5,
    dim_satire_cultural_impact: 5.5,
    dim_legislative_quality: 4.0,
    dim_flipflop_index: 6.0,
    chain_of_thought: "Test analysis",
    ...overrides,
  }];
}

// ── Test Harness ──────────────────────────────────────────────────────
// Simulates the App-level wiring between DetailView and AlertSubscriptionModal

let DetailView;
let AlertSubscriptionModal;

beforeEach(async () => {
  vi.resetModules();

  // Stub localStorage
  const storage = {};
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
  });

  // Stub fetch
  vi.stubGlobal("fetch", vi.fn());

  // Import fresh instances
  DetailView = (await import("../../src/components/DetailView.jsx")).default;
  AlertSubscriptionModal = (await import("../../src/components/AlertSubscriptionModal.jsx")).default;
});

/**
 * Harness that wires the bell icon in DetailView to open the AlertSubscriptionModal,
 * matching the real App.jsx wiring.
 */
function AlertFlowHarness({ hasSubscription = false, onSubscribe }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <DetailView
        todayDetail={makeTodayDetail()}
        selectedPolitician="Benjamin Netanyahu"
        selectedDate="2026-03-30"
        loading={false}
        isAlertSubscribed={false}
        onToggleAlert={() => {
          if (hasSubscription) {
            // Would call togglePolitician in real app
          } else {
            setModalOpen(true);
          }
        }}
      />
      <AlertSubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubscribe={onSubscribe || vi.fn().mockResolvedValue({})}
        allPoliticians={POLITICIANS}
        likedIds={["benjamin-netanyahu"]}
      />
    </>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("Alert subscription flow — bell icon to modal", () => {
  it("clicking bell icon opens the subscription modal", async () => {
    render(<AlertFlowHarness />);

    // Bell icon should be visible
    const bell = screen.getByTestId("alert-toggle");
    expect(bell).toBeInTheDocument();

    // Click bell
    fireEvent.click(bell);

    // Modal should be open
    expect(screen.getByText("Subscribe to Alerts")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("modal shows politician checklist after bell click", async () => {
    render(<AlertFlowHarness />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    // Verify modal dialog shows both politicians in the checklist
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Benjamin Netanyahu")).toBeInTheDocument();
    expect(within(dialog).getByText("Yair Lapid")).toBeInTheDocument();
  });

  it("modal pre-selects liked politicians", async () => {
    render(<AlertFlowHarness />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    const checkboxes = within(dialog).getAllByRole("checkbox");
    // benjamin-netanyahu is in likedIds, so should be pre-checked
    const checkedBoxes = checkboxes.filter((cb) => cb.checked);
    expect(checkedBoxes.length).toBe(1);
  });
});

describe("Alert subscription flow — form submission", () => {
  it("submits with email and selected politicians", async () => {
    const onSubscribe = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    // Open modal
    fireEvent.click(screen.getByTestId("alert-toggle"));

    // Fill email
    const dialog = screen.getByRole("dialog");
    const emailInput = within(dialog).getByPlaceholderText("Email address");
    await user.type(emailInput, "test@example.com");

    // Submit
    await user.click(within(dialog).getByText("Subscribe"));

    expect(onSubscribe).toHaveBeenCalledWith(
      "test@example.com",
      ["benjamin-netanyahu"],
      null
    );
  });

  it("shows success message after successful subscription", async () => {
    const onSubscribe = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("Email address"), "test@example.com");
    await user.click(within(dialog).getByText("Subscribe"));

    expect(screen.getByText("Subscribed!")).toBeInTheDocument();
    expect(screen.getByText("Check your email to verify")).toBeInTheDocument();
  });

  it("shows generic error on API failure", async () => {
    const onSubscribe = vi.fn().mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("Email address"), "test@example.com");
    await user.click(within(dialog).getByText("Subscribe"));

    expect(screen.getByText("Failed to subscribe")).toBeInTheDocument();
  });

  it("shows subscription-exists message for duplicate email", async () => {
    const err = new Error("subscription_exists");
    err.code = "subscription_exists";
    const onSubscribe = vi.fn().mockRejectedValue(err);
    const user = userEvent.setup();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("Email address"), "test@example.com");
    await user.click(within(dialog).getByText("Subscribe"));

    expect(screen.getByText("Already subscribed, check email")).toBeInTheDocument();
  });

  it("shows email-failed message when recovery email fails", async () => {
    const err = new Error("subscription_exists_email_failed");
    err.code = "subscription_exists_email_failed";
    const onSubscribe = vi.fn().mockRejectedValue(err);
    const user = userEvent.setup();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByPlaceholderText("Email address"), "test@example.com");
    await user.click(within(dialog).getByText("Subscribe"));

    expect(screen.getByText("Already subscribed, email failed")).toBeInTheDocument();
  });

  it("prevents submit with empty email", async () => {
    const onSubscribe = vi.fn();
    const user = userEvent.setup();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByText("Subscribe"));

    expect(screen.getByText("Email required")).toBeInTheDocument();
    expect(onSubscribe).not.toHaveBeenCalled();
  });

  it("prevents submit with invalid email", async () => {
    const onSubscribe = vi.fn();

    render(<AlertFlowHarness onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    const emailInput = within(dialog).getByPlaceholderText("Email address");
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.submit(emailInput.closest("form"));

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(onSubscribe).not.toHaveBeenCalled();
  });

  it("disables submit when no politicians selected", async () => {
    const user = userEvent.setup();

    render(<AlertFlowHarness />);

    fireEvent.click(screen.getByTestId("alert-toggle"));

    const dialog = screen.getByRole("dialog");
    // Deselect all
    await user.click(within(dialog).getByText("Deselect all"));

    const submitBtn = within(dialog).getByText("Subscribe");
    expect(submitBtn).toBeDisabled();
  });
});

describe("Alert subscription flow — bell icon states", () => {
  it("bell icon renders BellOff when not subscribed", () => {
    render(
      <AlertFlowHarness hasSubscription={false} />
    );

    const bell = screen.getByTestId("alert-toggle");
    expect(bell).toHaveAttribute("aria-label", "Enable alerts");
  });

  it("bell icon is always clickable (not disabled)", () => {
    render(<AlertFlowHarness />);

    const bell = screen.getByTestId("alert-toggle");
    expect(bell).not.toBeDisabled();
    expect(bell.tagName).toBe("BUTTON");
  });
});

describe("Alert subscription flow — useAlertState subscribe", () => {
  it("sends correct payload to /api/subscribe", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, token: "test-token", updated: false }),
    });

    const { default: useAlertState } = await import("../../src/lib/useAlertState.js");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.subscribe("test@example.com", ["pol-a", "pol-b"], null);
    });

    const fetchCall = globalThis.fetch.mock.calls[0];
    expect(fetchCall[0]).toBe("/api/subscribe");
    const body = JSON.parse(fetchCall[1].body);
    expect(body.email).toBe("test@example.com");
    expect(body.politicianIds).toEqual(["pol-a", "pol-b"]);
  });

  it("propagates subscription_exists error code", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "subscription_exists" }),
    });

    const { default: useAlertState } = await import("../../src/lib/useAlertState.js");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useAlertState());

    let caughtError;
    try {
      await act(async () => {
        await result.current.subscribe("test@example.com", ["pol-a"], null);
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe("subscription_exists");
  });

  it("togglePolitician optimistically updates then reverts on failure", async () => {
    const storage = {};
    vi.stubGlobal("localStorage", {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, val) => { storage[key] = String(val); },
      removeItem: (key) => { delete storage[key]; },
    });

    storage["politymarket-alert-subscription"] = JSON.stringify({
      email: "test@example.com",
      token: "abc",
      politicianIds: ["pol-a"],
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Token required" }),
    });

    const { default: useAlertState } = await import("../../src/lib/useAlertState.js");
    const { renderHook } = await import("@testing-library/react");

    const { result } = renderHook(() => useAlertState());

    await act(async () => {
      await result.current.togglePolitician("pol-b");
    });

    // Should revert — pol-b should NOT be in the list
    expect(result.current.subscription.politicianIds).toEqual(["pol-a"]);
  });
});
