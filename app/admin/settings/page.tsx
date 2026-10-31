"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

type Role = "admin" | "editor" | "viewer";
interface CmsUser { id: string; email: string; name: string; role: Role; created_at?: string }
interface CmsFaq { id: string; question: string; answer: string; position: number; status: "draft" | "published" }

const defaultSettings: Record<string, string> = {
  siteName: "", siteDescription: "", siteUrl: "", seoTitle: "", seoDescription: "",
  postsPerPage: "20", homepageHeroTitle: "", homepageHeroEyebrow: "",
  homepageHeroDescription: "", homepageApproachTitle: "", homepageApproachEyebrow: "",
  homepageApproachDescription: "", homepagePersonalizedCareTitle: "Personalized care at Roar Wellness",
  homepagePersonalizedCareDescription: "Professional guidance and compassionate support through recovery.",
  contactEmail: "", contactPhone: "",  contactWhatsApp: "", contactAddress: "",
};

function requestError(error: unknown): string {
  return error instanceof Error ? error.message : "CMS request failed.";
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [faqs, setFaqs] = useState<CmsFaq[]>([]);
  const [user, setUser] = useState<CmsUser | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [faqStatus, setFaqStatus] = useState<"draft" | "published">("published");
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "editor" as Role });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [importText, setImportText] = useState("");
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState("");

  const runAction = async (progress: string, action: () => Promise<void>): Promise<boolean> => {
    setError("");
    setNotice("");
    setPendingAction(progress);
    try {
      await action();
      return true;
    } catch (actionError) {
      setError(requestError(actionError));
      return false;
    } finally {
      setPendingAction("");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const settled = await Promise.allSettled([
      cmsRequest<{ data: Record<string, string> }>("/api/cms/settings"),
      cmsRequest<{ data: CmsUser[] }>("/api/cms/users"),
      cmsRequest<{ data: CmsFaq[] }>("/api/cms/faqs"),
      cmsRequest<{ data: CmsUser }>("/api/cms/session"),
    ]);
    const failures: string[] = [];
    if (settled[0].status === "fulfilled") setSettings({ ...defaultSettings, ...settled[0].value.data });
    else failures.push(`Site settings: ${requestError(settled[0].reason)}`);
    if (settled[1].status === "fulfilled") setUsers(settled[1].value.data);
    else failures.push(`CMS accounts: ${requestError(settled[1].reason)}`);
    if (settled[2].status === "fulfilled") setFaqs(settled[2].value.data);
    else failures.push(`FAQs: ${requestError(settled[2].reason)}`);
    if (settled[3].status === "fulfilled") setUser(settled[3].value.data);
    else failures.push(`Current account: ${requestError(settled[3].reason)}`);
    setError(failures.length ? `Some settings could not be loaded. ${failures.join(" ")}` : "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await runAction("Saving site settings…", async () => {
      await cmsRequest("/api/cms/settings", { method: "PUT", body: JSON.stringify(settings) });
    })) setNotice("Site settings saved. Changes are available on the next page load.");
  };

  const saveFaq = async (faq?: CmsFaq) => {
    const editingExistingFaq = Boolean(faq || editingFaq);
    const savedStatus = faq ? (faq.status === "published" ? "draft" : "published") : faqStatus;
    const success = await runAction(faq ? "Updating FAQ publication status…" : editingExistingFaq ? "Saving FAQ changes…" : "Adding FAQ…", async () => {
      if (faq) {
        await cmsRequest(`/api/cms/faqs/${encodeURIComponent(faq.id)}`, {
          method: "PUT",
          body: JSON.stringify({ ...faq, status: faq.status === "published" ? "draft" : "published" }),
        });
      } else {
        const payload = { question: faqQuestion, answer: faqAnswer, status: faqStatus, position: faqs.length };
        if (editingFaq) {
          await cmsRequest(`/api/cms/faqs/${encodeURIComponent(editingFaq)}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          await cmsRequest("/api/cms/faqs", { method: "POST", body: JSON.stringify(payload) });
        }
        setFaqQuestion("");
        setFaqAnswer("");
        setFaqStatus("published");
        setEditingFaq(null);
      }
      await load();
    });
    if (success) setNotice(faq
      ? `FAQ “${faq.question}” is now ${savedStatus === "published" ? "published" : "unpublished"}.`
      : editingExistingFaq ? "FAQ changes saved." : `FAQ ${savedStatus === "draft" ? "saved as draft" : "published"}.`);
  };

  const deleteFaq = async (faq: CmsFaq) => {
    if (!window.confirm(`Delete FAQ “${faq.question}”?`)) return;
    if (await runAction("Deleting FAQ…", async () => {
      await cmsRequest(`/api/cms/faqs/${encodeURIComponent(faq.id)}`, { method: "DELETE" });
      await load();
    })) setNotice(`FAQ “${faq.question}” was deleted.`);
  };

  const addUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accountName = newUser.name;
    const accountRole = newUser.role;
    if (await runAction("Creating CMS account…", async () => {
      await cmsRequest("/api/cms/users", { method: "POST", body: JSON.stringify(newUser) });
      setNewUser({ name: "", email: "", password: "", role: "editor" });
      await load();
    })) setNotice(`CMS account for ${accountName} was created with the ${accountRole} role.`);
  };

  const changeRole = async (account: CmsUser, role: Role) => {
    if (await runAction(`Updating ${account.name}’s role…`, async () => {
      await cmsRequest(`/api/cms/users/${encodeURIComponent(account.id)}`, { method: "PATCH", body: JSON.stringify({ role }) });
      await load();
    })) setNotice(`${account.name}’s role was changed to ${role}.`);
  };

  const deleteUser = async (account: CmsUser) => {
    if (!window.confirm(`Remove CMS access for ${account.email}?`)) return;
    if (await runAction(`Removing ${account.name}’s CMS account…`, async () => {
      await cmsRequest(`/api/cms/users/${encodeURIComponent(account.id)}`, { method: "DELETE" });
      await load();
    })) setNotice(`CMS account for ${account.name} was removed.`);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await runAction("Changing password and securing sessions…", async () => {
      await cmsRequest("/api/cms/profile/password", { method: "POST", body: JSON.stringify(passwordForm) });
      setPasswordForm({ currentPassword: "", newPassword: "" });
    })) setNotice("Your password was changed and other active sessions were signed out.");
  };

  const downloadBackup = async () => {
    if (!window.confirm("Download a full backup containing enquiry contact details, staff activity, and analytics events? Store the file in encrypted, access-controlled storage.")) return;
    if (await runAction("Preparing secure CMS backup…", async () => {
      const response = await fetch("/api/cms/backup", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Backup download failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `roar-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    })) setNotice("CMS backup downloaded. Store it in encrypted, access-controlled storage.");
  };

  const restoreBackup = async () => {
    if (!importText.trim()) { setError("Select a JSON backup or paste a PHP CMS content export first."); return; }
    let payload: unknown;
    try {
      payload = JSON.parse(importText);
    } catch (parseError) {
      setError(requestError(parseError));
      return;
    }
    const isBackup = typeof payload === "object" && payload !== null && "format" in payload && payload.format === "roar-cms-backup";
    const confirmMessage = isBackup
      ? "Restore this full backup? It replaces current CMS content, enquiries, analytics events, staff activity, settings, and media records. CMS accounts and active sessions are excluded. Export a backup first."
      : "Import this legacy CMS export? Legacy content imports are merged. Export a backup first.";
    if (!window.confirm(confirmMessage)) return;
    let completionMessage = "";
    const success = await runAction("Applying CMS backup or import…", async () => {
      const response = await cmsRequest<{ data: { restored?: boolean; imported?: number } }>(
        isBackup ? "/api/cms/backup" : "/api/cms/import",
        { method: "POST", body: JSON.stringify(payload) },
      );
      setImportText("");
      completionMessage = isBackup ? "CMS backup restored successfully." : `Imported ${response.data.imported ?? 0} content items.`;
      await load();
    });
    if (success) setNotice(completionMessage);
  };

  const readImportFile = async (file: File) => {
    if (await runAction("Reading import file…", async () => {
      setImportText(await file.text());
    })) setNotice(`${file.name} loaded. Review the JSON, then choose Import / restore JSON to apply it.`);
  };

  const setSetting = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const settingInput = (key: string, label: string, textarea = false, maxLength = 200) => (
    <label key={key} className="block text-sm font-medium text-cms-text">
      {label}
      {textarea
        ? <textarea maxLength={maxLength} rows={3} className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={settings[key] || ""} onChange={(event) => setSetting(key, event.target.value)} />
        : <input maxLength={maxLength} className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={settings[key] || ""} onChange={(event) => setSetting(key, event.target.value)} />}
    </label>
  );

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-3xl font-bold text-cms-text">CMS settings</h1>
        <p className="mt-2 text-sm text-cms-muted">Site metadata, homepage copy, FAQs, accounts, backups, and migration tools.</p>
      </header>
      <AdminFeedback error={error} notice={notice} progress={pendingAction} />

      <AdminAccordion
        id="settings-identity"
        title="Site identity and SEO"
        summary="Edit site metadata, contact details, and homepage copy."
        open={activePanel === "identity"}
        onToggle={() => setActivePanel(activePanel === "identity" ? null : "identity")}
      >
        <form onSubmit={saveSettings} className="mt-4 grid gap-4 md:grid-cols-2">
          {settingInput("siteName", "Site name")}
          {settingInput("siteUrl", "Canonical site URL")}
          {settingInput("siteDescription", "Site description", true, 1000)}
          {settingInput("seoTitle", "Default SEO title")}
          {settingInput("seoDescription", "Default SEO description", true, 500)}
          <label className="block text-sm font-medium text-cms-text">
            Archive items per page
            <input type="number" min="1" max="100" className="mt-1.5 w-full rounded-lg border border-cms-border px-3 py-2" value={settings.postsPerPage} onChange={(event) => setSetting("postsPerPage", event.target.value)} />
          </label>
          {settingInput("contactEmail", "Contact email")}
          {settingInput("contactPhone", "Contact phone")}
          {settingInput("contactWhatsApp", "WhatsApp number")}
          {settingInput("contactAddress", "Office address")}
          <div className="md:col-span-2"><h3 className="font-semibold text-cms-text">Homepage hero</h3></div>
          {settingInput("homepageHeroEyebrow", "Eyebrow")}
          {settingInput("homepageHeroTitle", "Heading")}
          {settingInput("homepageHeroDescription", "Description", true, 2000)}
          <div className="md:col-span-2"><h3 className="font-semibold text-cms-text">Homepage approach section</h3></div>
          {settingInput("homepageApproachEyebrow", "Eyebrow")}
          {settingInput("homepageApproachTitle", "Heading")}
          {settingInput("homepageApproachDescription", "Description", true, 5000)}
          <div className="md:col-span-2"><h3 className="font-semibold text-cms-text">Personalized care card copy</h3></div>
          {settingInput("homepagePersonalizedCareTitle", "Heading")}
          {settingInput("homepagePersonalizedCareDescription", "Description", true, 5000)}
          <p className="text-sm text-cms-muted md:col-span-2">Manage these homepage images, sliders, and cards under Homepage sections.</p>
          <div className="md:col-span-2"><Button type="submit" disabled={Boolean(pendingAction)}>{pendingAction ? "Working…" : "Save settings"}</Button></div>
        </form>
      </AdminAccordion>

      <AdminAccordion
        id="settings-faqs"
        title="Frequently asked questions"
        summary={`Manage homepage FAQs (${faqs.length}).`}
        open={activePanel === "faqs"}
        onToggle={() => setActivePanel(activePanel === "faqs" ? null : "faqs")}
      >
        <p className="mt-1 text-sm text-cms-muted">Published questions replace the homepage’s legacy fallback FAQs.</p>
        <form onSubmit={(event) => { event.preventDefault(); void saveFaq(); }} className="mt-4 space-y-3">
          <input required maxLength={300} className="w-full rounded-lg border border-cms-border px-3 py-2" placeholder="Question" value={faqQuestion} onChange={(event) => setFaqQuestion(event.target.value)} />
          <textarea required maxLength={5000} rows={3} className="w-full rounded-lg border border-cms-border px-3 py-2" placeholder="Answer" value={faqAnswer} onChange={(event) => setFaqAnswer(event.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <select className="rounded-lg border border-cms-border bg-white px-3 py-2" value={faqStatus} onChange={(event) => setFaqStatus(event.target.value as "draft" | "published")}>
              <option value="published">Published</option><option value="draft">Draft</option>
            </select>
            <Button type="submit" disabled={Boolean(pendingAction)}>{pendingAction ? "Working…" : editingFaq ? "Save FAQ" : "Add FAQ"}</Button>
            {editingFaq && <Button type="button" variant="secondary" disabled={Boolean(pendingAction)} onClick={() => { setEditingFaq(null); setFaqQuestion(""); setFaqAnswer(""); setFaqStatus("published"); }}>Cancel edit</Button>}
          </div>
        </form>
        <div className="mt-5 divide-y divide-cms-border border-y border-cms-border">
          {faqs.map((faq) => <article key={faq.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div><h3 className="font-semibold text-cms-text">{faq.question}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-cms-muted">{faq.answer}</p><span className="text-xs uppercase text-cms-muted">{faq.status}</span></div>
            <div className="flex gap-3">
              <button type="button" disabled={Boolean(pendingAction)} onClick={() => { setActivePanel("faqs"); setEditingFaq(faq.id); setFaqQuestion(faq.question); setFaqAnswer(faq.answer); setFaqStatus(faq.status); }} className="text-sm text-cms-primary disabled:opacity-50">Edit</button>
              <button type="button" disabled={Boolean(pendingAction)} onClick={() => void saveFaq(faq)} className="text-sm text-cms-primary disabled:opacity-50">{faq.status === "published" ? "Unpublish" : "Publish"}</button>
              {user?.role === "admin" && <button type="button" disabled={Boolean(pendingAction)} onClick={() => void deleteFaq(faq)} className="text-sm text-red-700 disabled:opacity-50">Delete</button>}
            </div>
          </article>)}
          {!loading && !faqs.length && <p className="py-4 text-sm text-cms-muted">No FAQs yet.</p>}
        </div>
      </AdminAccordion>

      <AdminAccordion
        id="settings-accounts"
        title="CMS accounts and roles"
        summary="Manage administrator, editor, and viewer access."
        open={activePanel === "accounts"}
        onToggle={() => setActivePanel(activePanel === "accounts" ? null : "accounts")}
      >
        <p className="mt-1 text-sm text-cms-muted">Admins control accounts and settings; editors manage content; viewers have read-only CMS access.</p>
        {user?.role === "admin" ? <>
          <form onSubmit={addUser} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input required maxLength={100} className="rounded-lg border border-cms-border px-3 py-2" placeholder="Full name" value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} />
            <input required type="email" className="rounded-lg border border-cms-border px-3 py-2" placeholder="Email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} />
            <input required minLength={12} type="password" className="rounded-lg border border-cms-border px-3 py-2" placeholder="Initial password (12+)" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
            <select className="rounded-lg border border-cms-border bg-white px-3 py-2" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as Role })}>
              <option value="editor">Editor</option><option value="viewer">Viewer</option><option value="admin">Admin</option>
            </select>
            <Button type="submit" disabled={Boolean(pendingAction)}>{pendingAction ? "Working…" : "Add account"}</Button>
          </form>
          <div className="mt-4 divide-y divide-cms-border border-y border-cms-border">
            {users.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-medium text-cms-text">{account.name}</p><p className="text-sm text-cms-muted">{account.email}</p></div>
              <div className="flex items-center gap-3">
                <select aria-label={`Role for ${account.email}`} disabled={Boolean(pendingAction)} className="rounded-lg border border-cms-border bg-white px-2 py-1.5 disabled:opacity-50" value={account.role} onChange={(event) => void changeRole(account, event.target.value as Role)}>
                  <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                </select>
                {account.id !== user.id && <button type="button" disabled={Boolean(pendingAction)} onClick={() => void deleteUser(account)} className="text-sm text-red-700 disabled:opacity-50">Remove</button>}
              </div>
            </div>)}
          </div>
        </> : <p className="mt-4 text-sm text-cms-muted">Only an administrator can manage accounts. Ask an administrator to grant access.</p>}
      </AdminAccordion>

      <AdminAccordion
        id="settings-password"
        title="Change your password"
        summary="Update the password for your CMS account."
        open={activePanel === "password"}
        onToggle={() => setActivePanel(activePanel === "password" ? null : "password")}
      >
        <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input required type="password" autoComplete="current-password" className="rounded-lg border border-cms-border px-3 py-2" placeholder="Current password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
          <input required minLength={12} type="password" autoComplete="new-password" className="rounded-lg border border-cms-border px-3 py-2" placeholder="New password (12+)" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
          <Button type="submit" disabled={Boolean(pendingAction)}>{pendingAction ? "Working…" : "Update password"}</Button>
        </form>
      </AdminAccordion>

      <AdminAccordion
        id="settings-backup"
        title="Backup and content migration"
        summary="Download a backup or restore/import content."
        open={activePanel === "backup"}
        onToggle={() => setActivePanel(activePanel === "backup" ? null : "backup")}
      >
        <p className="mt-1 text-sm text-cms-muted">Full backups include content, revision history, media, enquiry contact details, staff activity, and anonymous analytics events. CMS accounts and active sessions are excluded. Import WordPress or legacy CMS JSON exports containing `pages`, `posts`, `services`, `content`, or `items` arrays.</p>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Backups are downloaded manually; they are not encrypted or stored off-site automatically. Protect each file in encrypted, access-controlled storage and keep the CMS secrets separately.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" disabled={Boolean(pendingAction)} onClick={() => void downloadBackup()}>{pendingAction ? "Working…" : "Download full backup"}</Button>
          <label className="cursor-pointer rounded-lg border border-cms-border px-4 py-2 font-medium text-cms-text">
            Choose JSON file
            <input className="sr-only" type="file" accept="application/json,.json" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readImportFile(file);
              event.currentTarget.value = "";
            }} />
          </label>
        </div>
        <textarea rows={6} className="mt-3 w-full rounded-lg border border-cms-border px-3 py-2 font-mono text-xs" placeholder="Select a backup/export JSON or paste it here" value={importText} onChange={(event) => setImportText(event.target.value)} />
        <Button type="button" variant="danger" disabled={Boolean(pendingAction)} onClick={() => void restoreBackup()}>{pendingAction ? "Working…" : "Import / restore JSON"}</Button>
      </AdminAccordion>

    </div>
  );
}
