import { useEffect, useState } from "react";
import { changeAccountPassword, getAccountSettings, logoutAllSessions, saveAccountSettings, type AccountSettingsPayload } from "../../utils/authTrust";
import { validatePasswordChangeInput } from "./accountSettingsValidation";

const defaultAccount: AccountSettingsPayload = {
  fullName: "Boss Admin",
  email: "admin@example.com",
  role: "Owner",
  timezone: "UTC"
};

const AccountSettingsEditor = () => {
  const [form, setForm] = useState<AccountSettingsPayload>(defaultAccount);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);
  const [logoutAllMessage, setLogoutAllMessage] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoadingError("");
        const account = await getAccountSettings();
        if (!cancelled) setForm(account);
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : "Failed to load account settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading account settings...</p>;
  }

  return (
    <div className="space-y-4">
      {loadingError ? (
        <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {loadingError}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Full name</span>
          <input
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            value={form.email}
            readOnly
            disabled
            className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-3 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Locked after initial owner setup.</span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Role</span>
          <input
            value={form.role}
            readOnly
            disabled
            className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-3 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Single-owner role is fixed.</span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Timezone</span>
          <input
            value={form.timezone}
            onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            void (async () => {
              try {
                setSaving(true);
                setSaveError("");
                setSaved(false);
                const next = await saveAccountSettings(form);
                setForm(next);
                setSaved(true);
                setTimeout(() => setSaved(false), 1800);
              } catch (error) {
                setSaveError(error instanceof Error ? error.message : "Failed to save account settings.");
              } finally {
                setSaving(false);
              }
            })();
          }}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Account Settings"}
        </button>
        {saved ? <span className="text-xs text-emerald-600 dark:text-emerald-300">Saved</span> : null}
        {saveError ? <span className="text-xs text-rose-600 dark:text-rose-300">{saveError}</span> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Password & Security</h4>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />
            Show passwords
          </label>
        </div>
        <div className="grid gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Current password</span>
            <input
              type={showPasswords ? "text" : "password"}
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">New password</span>
            <input
              type={showPasswords ? "text" : "password"}
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Confirm new password</span>
            <input
              type={showPasswords ? "text" : "password"}
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={passwordSaving}
            onClick={() => {
              void (async () => {
                setPasswordError("");
                setPasswordSaved(false);
                const validationError = validatePasswordChangeInput(passwordForm);
                if (validationError) {
                  setPasswordError(validationError);
                  return;
                }
                try {
                  setPasswordSaving(true);
                  await changeAccountPassword(passwordForm.currentPassword, passwordForm.newPassword);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordSaved(true);
                  setTimeout(() => setPasswordSaved(false), 1800);
                } catch (error) {
                  setPasswordError(error instanceof Error ? error.message : "Failed to update password.");
                } finally {
                  setPasswordSaving(false);
                }
              })();
            }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
          {passwordSaved ? <span className="text-xs text-emerald-600 dark:text-emerald-300">Password updated</span> : null}
          {passwordError ? <span className="text-xs text-rose-600 dark:text-rose-300">{passwordError}</span> : null}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={logoutAllBusy}
            onClick={() => {
              void (async () => {
                try {
                  setLogoutAllBusy(true);
                  setLogoutAllMessage("");
                  await logoutAllSessions(true);
                  setLogoutAllMessage("All other sessions were logged out.");
                } catch (error) {
                  setLogoutAllMessage(error instanceof Error ? error.message : "Failed to logout other sessions.");
                } finally {
                  setLogoutAllBusy(false);
                }
              })();
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700"
          >
            {logoutAllBusy ? "Logging out..." : "Logout All Other Sessions"}
          </button>
          {logoutAllMessage ? <span className="text-xs text-slate-600 dark:text-slate-300">{logoutAllMessage}</span> : null}
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsEditor;
