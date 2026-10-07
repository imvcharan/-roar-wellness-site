"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface AdminAccordionProps {
  id: string;
  title: ReactNode;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function AdminAccordion({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}: AdminAccordionProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  return (
    <section className="overflow-hidden rounded-xl border border-cms-border bg-cms-surface shadow-sm">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-6 text-left hover:bg-cms-background"
      >
        <span>
          <span className="block text-xl font-semibold text-cms-text">{title}</span>
          {summary && <span className="mt-1 block text-sm font-normal text-cms-muted">{summary}</span>}
        </span>
        <span aria-hidden="true" className="text-2xl leading-none text-cms-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-trigger`}
          className="border-t border-cms-border p-6"
        >
          {children}
        </div>
      )}
    </section>
  );
}
