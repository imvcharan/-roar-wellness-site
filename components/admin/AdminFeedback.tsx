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
  return (
    <div className={`space-y-2 ${className}`} aria-live="polite">
      {progress && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{progress}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    </div>
  );
}
