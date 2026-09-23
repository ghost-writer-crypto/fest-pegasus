"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialQuery?: string;
};

export default function MyResultSearchForm({ initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/my-result?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/my-result");
    }
  };

  const handleClear = () => {
    setQuery("");
    router.push("/my-result");
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "640px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div className="pegasus-search" style={{ flexGrow: 1 }}>
          <span className="pegasus-search__icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Public ID (e.g. PGS-0001) or Chest Number..."
            className="pegasus-search__input"
            aria-label="Enter public identifier or chest number"
            autoFocus={!initialQuery}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute",
                right: "14px",
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "16px",
                padding: "4px",
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          className="pegasus-button pegasus-button--primary"
          style={{ minHeight: "48px", padding: "0 24px", flexShrink: 0 }}
        >
          Lookup Result
        </button>
      </div>
    </form>
  );
}

