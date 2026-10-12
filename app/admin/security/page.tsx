"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { cmsRequest } from "@/services/cms-api";

interface Session {
  session_id: string;
  created_at: string;
  expires_at: number;
  is_current: boolean;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionResult, mfaResult] = await Promise.all([
        cmsRequest<{ data: Session[] }>("/api/cms/profile/sessions"),
        cmsRequest<{ data: { enabled: boolean } }>("/api/cms/profile/mfa"),
      ]);
      setSessions(sessionResult.data);
      setMfaEnabled(mfaResult.data.enabled);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load active sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const revoke = async (session: Session) => {
    if (!window.confirm("Sign out this session?")) return;
    try {
      await cmsRequest("/api/cms/profile/sessions", {
        method: "DELETE",
        body: JSON.stringify({ sessionId: session.session_id }),
      });
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke session.");
    }
  };

  const startMfa = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await cmsRequest<{ data: { secret: string } }>("/api/cms/profile/mfa", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      });
      setSetupSecret(result.data.secret);
      setSetupCode("");
      setRecoveryCodes([]);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start authenticator setup.");
    } finally {
      setBusy(false);
    }
  };

  const verifyMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await cmsRequest<{ data: { recoveryCodes: string[] } }>("/api/cms/profile/mfa", {
        method: "POST",
        body: JSON.stringify({ action: "verify", code: setupCode }),
      });
      setRecoveryCodes(result.data.recoveryCodes);
      setMfaEnabled(true);
      setSetupSecret("");
      setSetupCode("");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify authenticator code.");
    } finally {
      setBusy(false);
    }
  };

  const disableMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await cmsRequest("/api/cms/profile/mfa", {
        method: "POST",
        body: JSON.stringify({ action: "disable", password: disablePassword, code: disableCode }),
      });
      setMfaEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setRecoveryCodes([]);
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : "Unable to disable multi-factor authentication.");
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy recovery codes.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cms-primary">Account protection</p>
        <h1 className="mt-1 text-3xl font-bold text-cms-text">Security</h1>
        <p className="mt-2 text-sm text-cms-muted">Review and sign out sessions for your CMS account.</p>
      </header>
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        CMS sessions expire after 8 hours. Device details and IP addresses are not collected. If you do not recognize a session, sign it out and change your password in Settings.
      </p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <section className="rounded-xl border border-cms-border bg-cms-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-cms-text">Authenticator app</h2>
            <p className="mt-1 text-sm text-cms-muted">{mfaEnabled ? "An authenticator app is required at sign-in." : "Add a time-based one-time password for stronger sign-in protection."}</p>
          </div>
          {!mfaEnabled && !setupSecret && <button type="button" disabled={busy} onClick={() => void startMfa()} className="rounded-lg bg-cms-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Set up MFA</button>}
        </div>
        {setupSecret && <form onSubmit={(event) => void verifyMfa(event)} className="mt-5 space-y-4 border-t border-cms-border pt-4">
          <p className="text-sm text-cms-muted">In your authenticator app, add an account manually with this key. Setup expires in 10 minutes.</p>
          <code className="block break-all rounded-lg bg-cms-background p-3 font-mono text-sm font-semibold tracking-wider text-cms-text">{setupSecret}</code>
          <label className="block max-w-sm text-sm font-medium text-cms-text">
            Enter the 6-digit code from the app
            <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={setupCode} onChange={(event) => setSetupCode(event.target.value)} className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" />
          </label>
          <button disabled={busy} className="rounded-lg bg-cms-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Verify and enable</button>
        </form>}
        {recoveryCodes.length > 0 && <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-950">Save your recovery codes now</h3>
          <p className="mt-1 text-sm text-amber-900">Each code works once if you lose your authenticator. They will not be shown again.</p>
          <div className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{recoveryCodes.map((code) => <code key={code} className="rounded bg-white px-2 py-1 text-center font-mono text-xs text-cms-text">{code}</code>)}</div>
          <button type="button" onClick={() => void copyRecoveryCodes()} className="text-sm font-semibold text-amber-950 underline">Copy recovery codes</button>
        </div>}
        {mfaEnabled && <form onSubmit={(event) => void disableMfa(event)} className="mt-5 grid gap-3 border-t border-cms-border pt-4 sm:grid-cols-3">
          <input required type="password" autoComplete="current-password" placeholder="Current password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} className="rounded-lg border border-cms-border px-3 py-2 text-sm" />
          <input required autoComplete="one-time-code" placeholder="Authenticator or recovery code" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} className="rounded-lg border border-cms-border px-3 py-2 text-sm" />
          <button disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">Disable MFA</button>
        </form>}
      </section>
      <section className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-cms-border px-5 py-4">
          <ShieldCheck className="text-cms-primary" size={20} />
          <h2 className="font-semibold text-cms-text">Active sessions</h2>
        </div>
        {loading ? <p role="status" className="p-6 text-sm text-cms-muted">Loading sessions…</p>
          : sessions.length ? <ul className="divide-y divide-cms-border">
            {sessions.map((session) => <li key={session.session_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium text-cms-text">{session.is_current ? "This session" : "Other session"}{session.is_current && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Current</span>}</p>
                <p className="mt-1 text-sm text-cms-muted">Signed in {dateLabel(session.created_at)} · expires {dateLabel(new Date(session.expires_at * 1000).toISOString())}</p>
              </div>
              {!session.is_current && <button type="button" onClick={() => void revoke(session)} className="inline-flex items-center gap-2 rounded-lg border border-cms-border px-3 py-2 text-sm font-medium text-cms-text hover:bg-red-50 hover:text-red-700"><LogOut size={15} />Sign out</button>}
            </li>)}
          </ul> : <p className="p-6 text-sm text-cms-muted">No active sessions found.</p>}
      </section>
    </div>
  );
}
