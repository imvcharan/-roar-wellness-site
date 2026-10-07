"use client";

import { useEffect, useRef, useState } from "react";
import { cmsRequest } from "@/services/cms-api";

interface MediaImageFieldProps {
  label: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  previewMode?: "contain" | "cover";
  previewPosition?: string;
  previewAlt?: string;
  className?: string;
}

interface UploadedMedia {
  url: string;
  width: number;
  height: number;
}

export function MediaImageField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  onUploadingChange,
  previewMode = "contain",
  previewPosition = "50% 50%",
  previewAlt,
  className = "",
}: MediaImageFieldProps) {
  const [url, setUrl] = useState(value ?? defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(value ?? defaultValue ?? "");
    setImageFailed(false);
  }, [value, defaultValue]);

  const updateUrl = (nextUrl: string) => {
    setUrl(nextUrl);
    setImageFailed(false);
    setError("");
    onChange?.(nextUrl);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await cmsRequest<{ data: UploadedMedia }>("/api/cms/media", {
        method: "POST",
        body: form,
      });
      updateUrl(response.data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-cms-text">
        {label}
        <input
          name={name}
          type="text"
          inputMode="url"
          value={url}
          onChange={(event) => updateUrl(event.target.value)}
          placeholder="Paste an image URL or upload an image"
          className="mt-1 w-full rounded-lg border border-cms-border px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`cursor-pointer rounded-lg border border-cms-border px-3 py-2 text-sm font-medium text-cms-primary hover:bg-cms-background ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          {uploading ? "Uploading…" : "Upload image"}
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,image/avif"
            disabled={uploading}
            onChange={(event) => { void upload(event.currentTarget.files?.[0]); }}
          />
        </label>
        {url && <button type="button" onClick={() => updateUrl("")} className="text-sm text-cms-muted underline">Remove image</button>}
        <p className="text-xs text-cms-muted">JPEG, PNG, WebP, GIF, TIFF, or AVIF · maximum 50 MB</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {url && !imageFailed && (
        <img
          src={url}
          alt={previewAlt || `${label} preview`}
          className={`rounded-lg border border-cms-border bg-cms-background ${previewMode === "cover" ? "aspect-[16/10] w-full object-cover" : "max-h-48 max-w-full object-contain"}`}
          style={{ objectPosition: previewPosition }}
          onError={() => setImageFailed(true)}
        />
      )}
      {url && imageFailed && <p role="status" className="text-sm text-amber-700">This image URL could not be previewed. Check the URL or upload a replacement.</p>}
    </div>
  );
}
