"use client";

import { type FormEvent, useState } from "react";
import { cmsRequest } from "@/services/cms-api";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await cmsRequest("/api/cms/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/admin") ? next : "/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="cms-login-page flex min-h-screen items-center justify-center px-5 py-12">
      <form onSubmit={submit} className="cms-login-card w-full max-w-md space-y-5 rounded-2xl border bg-cms-surface p-8 sm:p-10">
        <div>
          <img src="/images/logo.png" alt="Roar Wellness" className="mb-6 h-auto w-36" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cms-primary">Content management</p>
          <h1 className="mt-2 text-3xl font-bold text-cms-text">CMS sign in</h1>
          <p className="mt-2 text-sm text-cms-muted">Sign in with your CMS account email and password.</p>
        </div>
        <label className="block text-sm font-medium text-cms-text">
          Email
          <input
            autoComplete="username"
            className="mt-2 w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 text-cms-text"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-cms-text">
          Password
          <input
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-cms-border bg-white px-3 py-2.5 text-cms-text"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-cms-primary px-4 py-3 font-semibold text-white shadow-md shadow-[#4c3453]/15 transition-colors hover:bg-cms-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
