import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Bell, ChevronDown } from "lucide-react";
import useFocusTrap from "../lib/useFocusTrap";
import { localizeName } from "../lib/localize";

export default function AlertSubscriptionModal({
  isOpen,
  onClose,
  onSubscribe,
  likedIds = [],
  allPoliticians = [],
}) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  useFocusTrap(modalRef, isOpen);

  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-populate with liked politicians when opening
  useEffect(() => {
    if (isOpen && likedIds.length > 0) {
      setSelectedIds(likedIds);
    }
  }, [isOpen, likedIds]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const togglePolitician = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t("alerts.emailRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("alerts.emailInvalid"));
      return;
    }

    setSubmitting(true);
    try {
      await onSubscribe(email.trim(), selectedIds, webhookUrl.trim() || null);
      setSuccess(true);
    } catch (err) {
      if (err.code === "subscription_exists") {
        setError(t("alerts.subscriptionExists"));
      } else if (err.code === "subscription_exists_email_failed") {
        setError(t("alerts.subscriptionExistsEmailFailed"));
      } else {
        setError(t("alerts.subscribeFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Unique politicians for the checklist
  const uniquePoliticians = allPoliticians.reduce((acc, p) => {
    const id = p.politician_id || p.name;
    if (!acc.some((x) => (x.politician_id || x.name) === id)) {
      acc.push(p);
    }
    return acc;
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-modal-title"
          className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 id="alert-modal-title" className="text-lg font-bold text-white">
                {t("alerts.subscribeTitle")}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {success ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">{t("alerts.subscribeSuccess")}</p>
                <p className="text-sm text-gray-400">{t("alerts.verifyPrompt")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-400">{t("alerts.subscribeDescription")}</p>

                {/* Email */}
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("alerts.emailPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                {/* Advanced (webhook) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                    />
                    {t("alerts.advanced")}
                  </button>
                  {showAdvanced && (
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder={t("alerts.webhookPlaceholder")}
                      className="mt-2 w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      dir="ltr"
                    />
                  )}
                </div>

                {/* Politician selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">
                      {t("alerts.subscribedPoliticians")} ({selectedIds.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds(uniquePoliticians.map((p) => p.politician_id || p.name))
                        }
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        {t("alerts.selectAll")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="text-xs text-gray-500 hover:text-gray-400"
                      >
                        {t("alerts.deselectAll")}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50">
                    {uniquePoliticians.map((p) => {
                      const id = p.politician_id || p.name;
                      const checked = selectedIds.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePolitician(id)}
                            className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-300 truncate">
                            {localizeName(t, p.name)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || selectedIds.length === 0}
                  className="w-full py-2.5 rounded-lg bg-amber-500 text-gray-900 font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "..." : t("alerts.submitButton")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
