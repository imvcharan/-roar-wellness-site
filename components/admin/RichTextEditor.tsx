"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { cmsRequest } from "@/services/cms-api";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
}

interface UploadedMedia {
  url: string;
}

function containsUnsupportedLayout(html: string): boolean {
  return /<(?:div|iframe|table|video|audio|script|style|figure|section|svg)\b|\[(?:\/?[a-z][^\]]*)\]/i.test(html);
}

export function RichTextEditor({ label, value, onChange, maxLength, rows = 10 }: RichTextEditorProps) {
  const [mode, setMode] = useState<"visual" | "html">(() => containsUnsupportedLayout(value) ? "html" : "visual");
  const [error, setError] = useState("");
  const [imageSelected, setImageSelected] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ allowBase64: false }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    onSelectionUpdate: ({ editor: currentEditor }) => setImageSelected(currentEditor.isActive("image")),
  });

  useEffect(() => {
    if (editor && !editor.isFocused && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Enter link URL", current || "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: href.trim() }).run();
  };

  const uploadImage = async (file?: File) => {
    if (!file || !editor) return;
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await cmsRequest<{ data: UploadedMedia }>("/api/cms/media", { method: "POST", body: form });
      editor.chain().focus().setImage({ src: response.data.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const editImageAltText = () => {
    if (!editor?.isActive("image")) {
      setError("Select an image in the editor before editing its alt text.");
      return;
    }
    const currentAlt = editor.getAttributes("image").alt;
    const altText = window.prompt(
      "Describe this image for visitors using screen readers. Leave blank if it is decorative.",
      typeof currentAlt === "string" ? currentAlt : "",
    );
    if (altText === null) return;
    editor.chain().focus().updateAttributes("image", { alt: altText.trim() }).run();
    setError("");
  };

  const selectImageFromClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLImageElement) || !editor?.view.dom.contains(event.target)) return;
    const domPosition = editor.view.posAtDOM(event.target, 0);
    const imageSrc = event.target.getAttribute("src");
    let imagePosition: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name !== "image" || node.attrs.src !== imageSrc) return;
      const distance = Math.abs(position - domPosition);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        imagePosition = position;
      }
    });
    if (imagePosition === null) {
      setError("This image could not be selected. Try clicking it again.");
      return;
    }
    editor.commands.setNodeSelection(imagePosition);
    setImageSelected(editor.isActive("image"));
    setError("");
  };

  const isComplexContent = containsUnsupportedLayout(value);

  return (
    <section className="cms-rich-editor md:col-span-2" aria-label={label}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-cms-text">{label}</span>
        <div className="flex items-center gap-1 rounded-lg border border-cms-border bg-white p-1" role="group" aria-label={`${label} editing mode`}>
          <button type="button" onClick={() => setMode("visual")} aria-pressed={mode === "visual"} className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === "visual" ? "bg-cms-primary text-white" : "text-cms-muted hover:bg-cms-background"}`}>
            Visual
          </button>
          <button type="button" onClick={() => setMode("html")} aria-pressed={mode === "html"} className={`rounded-md px-2.5 py-1 text-xs font-medium ${mode === "html" ? "bg-cms-primary text-white" : "text-cms-muted hover:bg-cms-background"}`}>
            HTML
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-cms-muted">
        Format content visually, or switch to HTML for advanced edits. Inline images can be up to 50 MB.
        {isComplexContent && " This content includes custom layout markup; HTML mode preserves it best."}
      </p>
      {mode === "visual" ? (
        <div className="overflow-hidden rounded-lg border border-cms-border bg-white focus-within:border-cms-primary focus-within:ring-1 focus-within:ring-cms-primary">
          <div className="flex flex-wrap items-center gap-1 border-b border-cms-border bg-cms-background p-2">
            <ToolbarButton label="Paragraph" active={editor?.isActive("paragraph") ?? false} onClick={() => editor?.chain().focus().setParagraph().run()}>¶</ToolbarButton>
            <ToolbarButton label="Heading 2" active={editor?.isActive("heading", { level: 2 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
            <ToolbarButton label="Heading 3" active={editor?.isActive("heading", { level: 3 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
            <ToolbarButton label="Bold" active={editor?.isActive("bold") ?? false} onClick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
            <ToolbarButton label="Italic" active={editor?.isActive("italic") ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
            <ToolbarButton label="Bulleted list" active={editor?.isActive("bulletList") ?? false} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList") ?? false} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
            <ToolbarButton label="Block quote" active={editor?.isActive("blockquote") ?? false} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</ToolbarButton>
            <ToolbarButton label="Add or edit link" active={editor?.isActive("link") ?? false} onClick={setLink}>Link</ToolbarButton>
            <button type="button" onClick={() => fileInput.current?.click()} className="rounded-md px-2 py-1 text-xs font-medium text-cms-text hover:bg-white">Image</button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={editImageAltText}
              disabled={!editor}
              aria-pressed={imageSelected}
              title={imageSelected ? "Edit selected image alt text" : "Select an image to edit its alt text"}
              className={`rounded-md px-2 py-1 text-xs font-medium ${imageSelected ? "bg-cms-primary text-white" : "text-cms-text hover:bg-white"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Image alt text
            </button>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,image/avif" className="sr-only" onChange={(event) => { void uploadImage(event.currentTarget.files?.[0]); }} />
            <ToolbarButton label="Undo" active={false} onClick={() => editor?.chain().focus().undo().run()}>Undo</ToolbarButton>
            <ToolbarButton label="Redo" active={false} onClick={() => editor?.chain().focus().redo().run()}>Redo</ToolbarButton>
          </div>
          <div onClick={selectImageFromClick}>
            <EditorContent editor={editor} className="cms-rich-editor-content" style={{ minHeight: `${rows * 1.5}rem` }} />
          </div>
        </div>
      ) : (
        <textarea
          aria-label={`${label} HTML source`}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-cms-border px-3 py-2 font-mono text-xs"
          spellCheck={false}
        />
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium ${active ? "bg-cms-primary text-white" : "text-cms-text hover:bg-white"}`}
    >
      {children}
    </button>
  );
}
