"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

type Role = "admin" | "editor" | "viewer";
interface CmsUser { id: string; email: string; name: string; role: Role; created_at?: string }
interface CmsFaq { id: string; question: string; answer: string; position: number; status: "draft" | "published" }

const defaultSettings: Record<string, string> = {
  siteName: "", siteDescription: "", siteUrl: "", seoTitle: "", seoDescription: "",
  postsPerPage: "20", homepageHeroTitle: "", homepageHeroEyebrow: "",
  homepageHeroDescription: "", homepageApproachTitle: "", homepageApproachEyebrow: "",
  homepageApproachDescription: "", contactEmail: "", contactPhone: "",
  contactWhatsApp: "", contactAddress: "",
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

  const load = useCallback(async () => {
    setLoading(true);
    const settled = await Promise.allSettled([
      cmsRequest<{ data: Record<string, string> }>("/api/cms/settings"),
      cmsRequest<{ data: CmsUser[] }>("/api/cms/users"),
      cmsRequest<{ data: CmsFaq[] }>("/api/cms/faqs"),
      cmsRequest<{ data: CmsUser }>("/api/cms/session"),
    ]);
    if (settled[0].status === "fulfilled") setSettings({ ...defaultSettings, ...settled[0].value.data });
    else setError(requestError(settled[0].reason));
    if (settled[1].status === "fulfilled") setUsers(settled[1].value.data);
    if (settled[2].status === "fulfilled") setFaqs(settled[2].value.data);
    if (settled[3].status === "fulfilled") setUser(settled[3].value.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await cmsRequest("/api/cms/settings", { method: "PUT", body: JSON.stringify(settings) });
      setNotice("Site settings saved. Updated text appears on the next page load.");
    } catch (saveError) { setError(requestError(saveError)); }
  };

  const saveFaq = async (faq?: CmsFaq) => {
    setError("");
    setNotice("");
    try {
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
      setNotice(faq ? "FAQ publication status updated." : editingFaq ? "FAQ updated." : "FAQ published.");
      await load();
    } catch (faqError) { setError(requestError(faqError)); }
  };

  const deleteFaq = async (faq: CmsFaq) => {
    if (!window.confirm(`Delete FAQ “${faq.question}”?`)) return;
    try {
      await cmsRequest(`/api/cms/faqs/${encodeURIComponent(faq.id)}`, { method: "DELETE" });
      setNotice("FAQ deleted.");
      await load();
    } catch (deleteError) { setError(requestError(deleteError)); }
  };

  const addUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await cmsRequest("/api/cms/users", { method: "POST", body: JSON.stringify(newUser) });
      setNewUser({ name: "", email: "", password: "", role: "editor" });
      setNotice("CMS account created.");
      await load();
    } catch (userError) { setError(requestError(userError)); }
  };

  const changeRole = async (account: CmsUser, role: Role) => {
    try {
      await cmsRequest(`/api/cms/users/${encodeURIComponent(account.id)}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setNotice("Account role updated.");
      await load();
    } catch (roleError) { setError(requestError(roleError)); }
  };

  const deleteUser = async (account: CmsUser) => {
    if (!window.confirm(`Remove CMS access for ${account.email}?`)) return;
    try {
      await cmsRequest(`/api/cms/users/${encodeURIComponent(account.id)}`, { method: "DELETE" });
      setNotice("CMS account removed.");
      await load();
    } catch (deleteError) { setError(requestError(deleteError)); }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await cmsRequest("/api/cms/profile/password", { method: "POST", body: JSON.stringify(passwordForm) });
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setNotice("Your password has been changed.");
    } catch (passwordError) { setError(requestError(passwordError)); }
  };

  const downloadBackup = async () => {
    try {
      const response = await fetch("/api/cms/backup", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error || "Backup download failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `roar-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Backup downloaded.");
    } catch (backupError) { setError(requestError(backupError)); }
  };

  const restoreBackup = async () => {
    if (!importText.trim()) { setError("Select a JSON backup or paste a PHP CMS content export first."); return; }
    if (!window.confirm("Restore/import this JSON? A Roar CMS backup replaces all CMS content, FAQs, settings, and media records. Legacy CMS imports are merged. Export a backup first.")) return;
    try {
      const payload: unknown = JSON.parse(importText);
      const isBackup = typeof payload === "object" && payload !== null && "format" in payload && payload.format === "roar-cms-backup";
      const response = await cmsRequest<{ data: { restored?: boolean; imported?: number } }>(
        isBackup ? "/api/cms/backup" : "/api/cms/import",
        { method: "POST", body: JSON.stringify(payload) },
      );
      setImportText("");
      setNotice(isBackup ? "CMS backup restored." : `Imported ${response.data.imported ?? 0} content items.`);
      await load();
    } catch (importError) { setError(importError instanceof Error ? importError.message : "Import failed."); }
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
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

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
          <div className="md:col-span-2"><Button type="submit">Save settings</Button></div>
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
            <Button type="submit">{editingFaq ? "Save FAQ" : "Add FAQ"}</Button>
            {editingFaq && <Button type="button" variant="secondary" onClick={() => { setEditingFaq(null); setFaqQuestion(""); setFaqAnswer(""); setFaqStatus("published"); }}>Cancel edit</Button>}
          </div>
        </form>
        <div className="mt-5 divide-y divide-cms-border border-y border-cms-border">
          {faqs.map((faq) => <article key={faq.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div><h3 className="font-semibold text-cms-text">{faq.question}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-cms-muted">{faq.answer}</p><span className="text-xs uppercase text-cms-muted">{faq.status}</span></div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setActivePanel("faqs"); setEditingFaq(faq.id); setFaqQuestion(faq.question); setFaqAnswer(faq.answer); setFaqStatus(faq.status); }} className="text-sm text-cms-primary">Edit</button>
              <button type="button" onClick={() => void saveFaq(faq)} className="text-sm text-cms-primary">{faq.status === "published" ? "Unpublish" : "Publish"}</button>
              {user?.role === "admin" && <button type="button" onClick={() => void deleteFaq(faq)} className="text-sm text-red-700">Delete</button>}
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
            <Button type="submit">Add account</Button>
          </form>
          <div className="mt-4 divide-y divide-cms-border border-y border-cms-border">
            {users.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-medium text-cms-text">{account.name}</p><p className="text-sm text-cms-muted">{account.email}</p></div>
              <div className="flex items-center gap-3">
                <select aria-label={`Role for ${account.email}`} className="rounded-lg border border-cms-border bg-white px-2 py-1.5" value={account.role} onChange={(event) => void changeRole(account, event.target.value as Role)}>
                  <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                </select>
                {account.id !== user.id && <button type="button" onClick={() => void deleteUser(account)} className="text-sm text-red-700">Remove</button>}
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
          <Button type="submit">Update password</Button>
        </form>
      </AdminAccordion>

      <AdminAccordion
        id="settings-backup"
        title="Backup and content migration"
        summary="Download a backup or restore/import content."
        open={activePanel === "backup"}
        onToggle={() => setActivePanel(activePanel === "backup" ? null : "backup")}
      >
        <p className="mt-1 text-sm text-cms-muted">Backups include content, categories, FAQs, site settings, media files, and revision history. Import WordPress or legacy CMS JSON exports containing `pages`, `posts`, `services`, `content`, or `items` arrays.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void downloadBackup()}>Download full backup</Button>
          <label className="cursor-pointer rounded-lg border border-cms-border px-4 py-2 font-medium text-cms-text">
            Choose JSON file
            <input className="sr-only" type="file" accept="application/json,.json" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) setImportText(await file.text());
              event.currentTarget.value = "";
            }} />
          </label>
        </div>
        <textarea rows={6} className="mt-3 w-full rounded-lg border border-cms-border px-3 py-2 font-mono text-xs" placeholder="Select a backup/export JSON or paste it here" value={importText} onChange={(event) => setImportText(event.target.value)} />
        <Button type="button" variant="danger" onClick={() => void restoreBackup()}>Import / restore JSON</Button>
      </AdminAccordion>

    </div>
  );
}
