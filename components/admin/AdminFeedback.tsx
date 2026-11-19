"use client";

interface AdminFeedbackProps {
  error?: string;
  notice?: string;
  progress?: string;
  className?: string;
}

export function AdminFeedback({
  error,
  notice,
  progress,
  className = "",
}: AdminFeedbackProps) {
  if (!error && !notice && !progress) return null;

  return (
    <div className={`pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw_-_2rem)] max-w-md flex-col gap-2 ${className}`} aria-live="polite">
      {progress && <p role="status" className="pointer-events-auto rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 shadow-lg">{progress}</p>}
      {error && <p role="alert" className="pointer-events-auto rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow-lg">{error}</p>}
      {notice && <p role="status" className="pointer-events-auto rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 shadow-lg">{notice}</p>}
    </div>
  );
}
