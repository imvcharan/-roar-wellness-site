"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { MediaImageField } from "@/components/admin/MediaImageField";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

interface TeamMember {
  section_key: string;
  group_name: string;
  heading: string;
  eyebrow: string;
  body: string;
  image_url: string;
  position: number;
  is_published: number;
}

type CmsRole = "admin" | "editor" | "viewer";

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [newMemberMediaKey, setNewMemberMediaKey] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState<CmsRole | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await cmsRequest<{ data: TeamMember[] }>("/api/cms/home");
      setMembers(data.filter((item) => item.group_name === "team"));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load team profiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    cmsRequest<{ data: { role: CmsRole } }>("/api/cms/session")
      .then(({ data }) => setRole(data.role))
      .catch((loadError: unknown) => console.error("Unable to load CMS permissions.", loadError));
  }, [load]);

  const saveNew = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadingImage) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await cmsRequest("/api/cms/home", {
        method: "POST",
        body: JSON.stringify({
          group_name: "team",
          heading: form.get("heading"),
          eyebrow: form.get("eyebrow"),
          body: form.get("body"),
          image_url: form.get("image_url"),
          position: Number(form.get("position")),
          is_published: form.get("is_published") === "on",
        }),
      });
      formElement.reset();
      setNewMemberMediaKey((current) => current + 1);
      setNewMemberOpen(false);
      const heading = String(form.get("heading") || "Team member");
      const published = form.get("is_published") === "on";
      setNotice(`${heading} was created and ${published ? "published" : "saved as unpublished"}.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create team profile.");
    } finally {
      setSaving(false);
    }
  };

  const saveMember = async (event: FormEvent<HTMLFormElement>, member: TeamMember) => {
    event.preventDefault();
    if (uploadingImage) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await cmsRequest(`/api/cms/home/${encodeURIComponent(member.section_key)}`, {
        method: "PATCH",
        body: JSON.stringify({
          group_name: "team",
          heading: form.get("heading"),
          eyebrow: form.get("eyebrow"),
          body: form.get("body"),
          image_url: form.get("image_url"),
          position: Number(form.get("position")),
          is_published: form.get("is_published") === "on",
        }),
      });
      const heading = String(form.get("heading") || member.heading);
      const imageChanged = String(form.get("image_url") || "") !== member.image_url;
      const published = form.get("is_published") === "on";
      setNotice(`${heading} was updated${imageChanged ? ", including the profile photo" : ""} and ${published ? "is published" : "is unpublished"}.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save team profile.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Delete the profile for “${member.heading}”?`)) return;
    setError("");
    setNotice("");
    setDeletingMember(member.section_key);
    try {
      await cmsRequest(`/api/cms/home/${encodeURIComponent(member.section_key)}`, { method: "DELETE" });
      setNotice(`${member.heading} was deleted from team profiles.`);
      setActiveMember(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete team profile.");
    } finally {
      setDeletingMember(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-cms-text">Team management</h1>
        <p className="mt-2 text-sm text-cms-muted">Create and manage the profiles shown in the Our Team archive. The label is displayed as each member’s role badge.</p>
      </header>
      <AdminFeedback
        error={error}
        notice={notice}
        progress={saving ? "Saving team profile…" : deletingMember ? "Deleting team profile…" : undefined}
      />
      <AdminAccordion
        id="team-new-member"
        title="Add team member"
        summary="Add a profile, role badge, photo, and biography."
        open={newMemberOpen}
        onToggle={() => {
          setNewMemberOpen((current) => !current);
          setActiveMember(null);
        }}
      >
        <form onSubmit={(event) => void saveNew(event)} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-cms-text">Name<input name="heading" required maxLength={200} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <label className="text-sm font-medium text-cms-text">Role badge<input name="eyebrow" maxLength={200} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <MediaImageField key={newMemberMediaKey} name="image_url" label="Profile image" onUploadingChange={setUploadingImage} className="md:col-span-2" />
          <label className="text-sm font-medium text-cms-text">Display order<input name="position" type="number" min="0" max="1000" defaultValue={members.length} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm font-medium text-cms-text"><input name="is_published" type="checkbox" defaultChecked /> Published on website</label>
          <label className="text-sm font-medium text-cms-text md:col-span-2">Biography<textarea name="body" rows={4} maxLength={5000} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <div className="md:col-span-2"><Button type="submit" disabled={uploadingImage || saving}>{saving ? "Saving…" : "Add team member"}</Button></div>
        </form>
      </AdminAccordion>
      <section aria-label="Team profiles" className="space-y-3">
        {loading && <p className="text-sm text-cms-muted">Loading team profiles...</p>}
        {!loading && members.map((member, index) => (
          <AdminAccordion
            key={member.section_key}
            id={`team-member-${index}`}
            title={member.heading}
            summary={`${member.eyebrow || "No role badge"} · ${member.is_published === 1 ? "Published" : "Unpublished"} · Order ${member.position}`}
            open={activeMember === member.section_key}
            onToggle={() => {
              setActiveMember(activeMember === member.section_key ? null : member.section_key);
              setNewMemberOpen(false);
            }}
          >
            <form onSubmit={(event) => void saveMember(event, member)} className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-cms-text">Name<input name="heading" required maxLength={200} defaultValue={member.heading} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
              <label className="text-sm font-medium text-cms-text">Role badge<input name="eyebrow" maxLength={200} defaultValue={member.eyebrow || ""} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
              <MediaImageField name="image_url" label="Profile image" defaultValue={member.image_url || ""} onUploadingChange={setUploadingImage} className="md:col-span-2" />
              <label className="text-sm font-medium text-cms-text">Display order<input name="position" type="number" min="0" max="1000" defaultValue={member.position} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
              <label className="flex items-center gap-2 text-sm font-medium text-cms-text"><input name="is_published" type="checkbox" defaultChecked={member.is_published === 1} /> Published on website</label>
              <label className="text-sm font-medium text-cms-text md:col-span-2">Biography<textarea name="body" rows={4} maxLength={5000} defaultValue={member.body || ""} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" size="sm" disabled={uploadingImage || saving || deletingMember !== null}>{saving ? "Saving…" : "Save profile"}</Button>
                {role === "admin" && <Button type="button" size="sm" variant="danger" disabled={saving || deletingMember !== null} onClick={() => void deleteMember(member)}>{deletingMember === member.section_key ? "Deleting…" : "Delete"}</Button>}
              </div>
            </form>
          </AdminAccordion>
        ))}
        {!loading && members.length === 0 && <p className="text-sm text-cms-muted">No team profiles yet. Add a team member to get started.</p>}
      </section>
      {role !== "admin" && <p className="text-xs text-cms-muted">Only administrators can delete team profiles.</p>}
    </div>
  );
}
