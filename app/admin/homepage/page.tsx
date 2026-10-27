"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AdminAccordion } from "@/components/admin/AdminAccordion";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { MediaImageField } from "@/components/admin/MediaImageField";
import { Button } from "@/components/ui/Button";
import { cmsRequest } from "@/services/cms-api";

interface HomeCard {
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

const groups = [
  ["team", "Team"],
  ["facility", "Facilities"],
  ["approach", "Approach cards"],
];

export default function HomepagePage() {
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [group, setGroup] = useState("team");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [newCardMediaKey, setNewCardMediaKey] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingCard, setDeletingCard] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState<CmsRole | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await cmsRequest<{ data: HomeCard[] }>("/api/cms/home");
      setCards(result.data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load homepage content.");
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
          group_name: group,
          heading: form.get("heading"),
          eyebrow: form.get("eyebrow"),
          body: form.get("body"),
          image_url: form.get("image_url"),
          position: Number(form.get("position")),
          is_published: form.get("is_published") === "on",
        }),
      });
      formElement.reset();
      setNewCardMediaKey((current) => current + 1);
      const heading = String(form.get("heading") || "Homepage card");
      const published = form.get("is_published") === "on";
      setNotice(`${heading} was created and ${published ? "published" : "saved as unpublished"}.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create homepage card.");
    } finally {
      setSaving(false);
    }
  };

  const saveCard = async (event: FormEvent<HTMLFormElement>, card: HomeCard) => {
    event.preventDefault();
    if (uploadingImage) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await cmsRequest(`/api/cms/home/${encodeURIComponent(card.section_key)}`, {
        method: "PATCH",
        body: JSON.stringify({
          group_name: form.get("group_name"),
          heading: form.get("heading"),
          eyebrow: form.get("eyebrow"),
          body: form.get("body"),
          image_url: form.get("image_url"),
          position: Number(form.get("position")),
          is_published: form.get("is_published") === "on",
        }),
      });
      const heading = String(form.get("heading") || card.heading);
      const imageChanged = String(form.get("image_url") || "") !== card.image_url;
      const published = form.get("is_published") === "on";
      setNotice(`${heading} was updated${imageChanged ? ", including its image" : ""} and ${published ? "is published" : "is unpublished"}.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save homepage card.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCard = async (card: HomeCard) => {
    if (!window.confirm(`Remove “${card.heading}” from the homepage?`)) return;
    setError("");
    setNotice("");
    setDeletingCard(card.section_key);
    try {
      await cmsRequest(`/api/cms/home/${encodeURIComponent(card.section_key)}`, { method: "DELETE" });
      setNotice(`${card.heading} was deleted.`);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete homepage card.");
    } finally {
      setDeletingCard(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-cms-text">Homepage sections</h1>
        <p className="mt-2 text-sm text-cms-muted">Manage team profiles, facilities, and approach cards. Manage testimonials from their dedicated section.</p>
      </header>
      <AdminFeedback
        error={error}
        notice={notice}
        progress={saving ? "Saving homepage card…" : deletingCard ? "Deleting homepage card…" : undefined}
      />
      <AdminAccordion
        id="homepage-new-card"
        title="Add homepage card"
        summary="Create a team profile, facility, or approach card."
        open={activePanel === "new"}
        onToggle={() => {
          setActivePanel(activePanel === "new" ? null : "new");
          setActiveCard(null);
        }}
      >
        <form onSubmit={(event) => void saveNew(event)} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-cms-text">Section
            <select className="mt-1 w-full rounded-lg border border-cms-border bg-white px-3 py-2" value={group} onChange={(event) => setGroup(event.target.value)}>
              {groups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-cms-text">Heading<input name="heading" required maxLength={200} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <label className="text-sm font-medium text-cms-text">Label / role<input name="eyebrow" maxLength={200} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <MediaImageField key={newCardMediaKey} name="image_url" label="Image" onUploadingChange={setUploadingImage} className="md:col-span-2" />
          <label className="text-sm font-medium text-cms-text">Position<input name="position" type="number" min="0" max="1000" defaultValue={0} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm font-medium text-cms-text"><input name="is_published" type="checkbox" defaultChecked /> Published</label>
          <label className="text-sm font-medium text-cms-text md:col-span-2">Description<textarea name="body" rows={3} maxLength={5000} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
          <div className="md:col-span-2"><Button type="submit" disabled={uploadingImage || saving}>{saving ? "Saving…" : "Add card"}</Button></div>
        </form>
        <p className="mt-3 text-xs text-cms-muted">Published cards are shown on the homepage in their configured order. Unpublished cards remain saved in this editor.</p>
      </AdminAccordion>
      {groups.map(([key, label]) => {
        const items = cards.filter((card) => card.group_name === key);
        return <AdminAccordion
          key={key}
          id={`homepage-group-${key}`}
          title={`${label} (${items.length})`}
          summary="Select a card below to open its editor."
          open={activePanel === key}
          onToggle={() => {
            setActivePanel(activePanel === key ? null : key);
            setActiveCard(null);
          }}
        >
          <div className="space-y-3">
            {items.map((card, index) => (
              <AdminAccordion
                key={card.section_key}
                id={`homepage-card-${key}-${index}`}
                title={card.heading}
                summary={`${card.is_published === 1 ? "Published" : "Unpublished"} · Position ${card.position}`}
                open={activeCard === card.section_key}
                onToggle={() => setActiveCard(activeCard === card.section_key ? null : card.section_key)}
              >
                <form onSubmit={(event) => void saveCard(event, card)} className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-cms-text">Section<select name="group_name" defaultValue={card.group_name} className="mt-1 w-full rounded-lg border border-cms-border bg-white px-3 py-2">{groups.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
                  <label className="text-sm font-medium text-cms-text">Heading<input name="heading" required maxLength={200} defaultValue={card.heading} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
                  <label className="text-sm font-medium text-cms-text">Label / role<input name="eyebrow" maxLength={200} defaultValue={card.eyebrow || ""} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
                  <MediaImageField name="image_url" label="Image" defaultValue={card.image_url || ""} onUploadingChange={setUploadingImage} />
                  <label className="text-sm font-medium text-cms-text">Position<input name="position" type="number" min="0" max="1000" defaultValue={card.position} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
                  <label className="flex items-center gap-2 text-sm font-medium text-cms-text"><input name="is_published" type="checkbox" defaultChecked={card.is_published === 1} /> Published</label>
                  <label className="text-sm font-medium text-cms-text md:col-span-2">Description<textarea name="body" rows={3} maxLength={5000} defaultValue={card.body || ""} className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2" /></label>
                  <div className="flex gap-2 md:col-span-2"><Button type="submit" size="sm" disabled={uploadingImage || saving || deletingCard !== null}>{saving ? "Saving…" : "Save card"}</Button>{role === "admin" && <Button type="button" size="sm" variant="danger" disabled={saving || deletingCard !== null} onClick={() => void deleteCard(card)}>{deletingCard === card.section_key ? "Deleting…" : "Delete"}</Button>}</div>
                </form>
              </AdminAccordion>
            ))}
            {!items.length && <p className="text-sm text-cms-muted">No cards in this section yet.</p>}
          </div>
        </AdminAccordion>;
      })}
    </div>
  );
}
