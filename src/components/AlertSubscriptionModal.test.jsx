// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlertSubscriptionModal from "./AlertSubscriptionModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const dict = {
        "alerts.subscribeTitle": "Subscribe to Alerts",
        "alerts.subscribeDescription": "Get notified when scores change",
        "alerts.emailPlaceholder": "Email address",
        "alerts.webhookPlaceholder": "Webhook URL (optional)",
        "alerts.submitButton": "Subscribe",
        "alerts.advanced": "Advanced",
        "alerts.subscribedPoliticians": "Watched politicians",
        "alerts.selectAll": "Select all",
        "alerts.deselectAll": "Deselect all",
        "alerts.emailRequired": "Email required",
        "alerts.emailInvalid": "Invalid email",
        "alerts.subscribeSuccess": "Subscribed!",
        "alerts.subscribeFailed": "Failed",
        "alerts.subscriptionExists": "Subscription exists, check email",
        "alerts.subscriptionExistsEmailFailed": "Subscription exists, email failed",
        "alerts.verifyPrompt": "Check your email",
      };
      return dict[key] || key;
    },
    i18n: { language: "he", dir: () => "rtl", changeLanguage: () => {} },
  }),
}));

vi.mock("../lib/localize", () => ({
  localizeName: (_t, name) => name,
}));

vi.mock("../lib/useFocusTrap", () => ({
  default: () => {},
}));

const allPoliticians = [
  { politician_id: "pol-a", name: "Politician A" },
  { politician_id: "pol-b", name: "Politician B" },
  { politician_id: "pol-c", name: "Politician C" },
];

describe("AlertSubscriptionModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <AlertSubscriptionModal
        isOpen={false}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders modal with title when isOpen is true", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    expect(screen.getByText("Subscribe to Alerts")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "alert-modal-title");
  });

  it("shows email input with placeholder", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
  });

  it("shows all politicians in checklist", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    expect(screen.getByText("Politician A")).toBeInTheDocument();
    expect(screen.getByText("Politician B")).toBeInTheDocument();
    expect(screen.getByText("Politician C")).toBeInTheDocument();
  });

  it("pre-selects liked politicians", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
        likedIds={["pol-a", "pol-c"]}
      />
    );
    const checkboxes = screen.getAllByRole("checkbox");
    // pol-a and pol-c should be checked
    const checked = checkboxes.filter((cb) => cb.checked);
    expect(checked.length).toBe(2);
  });

  it("shows error for empty email on submit", async () => {
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    await user.click(screen.getByText("Subscribe"));
    expect(screen.getByText("Email required")).toBeInTheDocument();
  });

  it("shows error for invalid email format", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    const emailInput = screen.getByPlaceholderText("Email address");
    // Use fireEvent to bypass HTML5 email validation
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.submit(emailInput.closest("form"));
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("calls onSubscribe with correct args on valid submit", async () => {
    const onSubscribe = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={onSubscribe}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    await user.type(screen.getByPlaceholderText("Email address"), "user@test.com");
    await user.click(screen.getByText("Subscribe"));
    expect(onSubscribe).toHaveBeenCalledWith("user@test.com", ["pol-a"], null);
  });

  it("shows success message after successful subscribe", async () => {
    const onSubscribe = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={onSubscribe}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    await user.type(screen.getByPlaceholderText("Email address"), "user@test.com");
    await user.click(screen.getByText("Subscribe"));
    expect(screen.getByText("Subscribed!")).toBeInTheDocument();
    expect(screen.getByText("Check your email")).toBeInTheDocument();
  });

  it("shows error on subscribe failure", async () => {
    const onSubscribe = vi.fn().mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={onSubscribe}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    await user.type(screen.getByPlaceholderText("Email address"), "user@test.com");
    await user.click(screen.getByText("Subscribe"));
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows subscription-exists message when error code is subscription_exists", async () => {
    const err = new Error("subscription_exists");
    err.code = "subscription_exists";
    const onSubscribe = vi.fn().mockRejectedValue(err);
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={onSubscribe}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    await user.type(screen.getByPlaceholderText("Email address"), "user@test.com");
    await user.click(screen.getByText("Subscribe"));
    expect(screen.getByText("Subscription exists, check email")).toBeInTheDocument();
  });

  it("shows email-failed message when error code is subscription_exists_email_failed", async () => {
    const err = new Error("subscription_exists_email_failed");
    err.code = "subscription_exists_email_failed";
    const onSubscribe = vi.fn().mockRejectedValue(err);
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={onSubscribe}
        allPoliticians={allPoliticians}
        likedIds={["pol-a"]}
      />
    );
    await user.type(screen.getByPlaceholderText("Email address"), "user@test.com");
    await user.click(screen.getByText("Subscribe"));
    expect(screen.getByText("Subscription exists, email failed")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={onClose}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    // The backdrop is the first fixed div with aria-hidden
    fireEvent.click(screen.getByRole("dialog").parentElement.previousSibling);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={onClose}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles advanced section to show webhook input", async () => {
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    expect(screen.queryByPlaceholderText("Webhook URL (optional)")).not.toBeInTheDocument();
    await user.click(screen.getByText("Advanced"));
    expect(screen.getByPlaceholderText("Webhook URL (optional)")).toBeInTheDocument();
  });

  it("select all selects all politicians", async () => {
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
      />
    );
    await user.click(screen.getByText("Select all"));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.every((cb) => cb.checked)).toBe(true);
  });

  it("deselect all clears all politicians", async () => {
    const user = userEvent.setup();
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
        likedIds={["pol-a", "pol-b", "pol-c"]}
      />
    );
    await user.click(screen.getByText("Deselect all"));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.every((cb) => !cb.checked)).toBe(true);
  });

  it("submit button is disabled when no politicians selected", () => {
    render(
      <AlertSubscriptionModal
        isOpen={true}
        onClose={() => {}}
        onSubscribe={() => {}}
        allPoliticians={allPoliticians}
        likedIds={[]}
      />
    );
    expect(screen.getByText("Subscribe")).toBeDisabled();
  });
});
