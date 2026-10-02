"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ArrowRight, UserCheck } from "lucide-react";
import styles from "@/components/athlete/athletePass.module.css";

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
    <div className={styles.searchCard}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.inputWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Chest Number (e.g. 1001) or Athlete ID..."
            className={styles.searchInput}
            aria-label="Enter athlete chest number or identifier"
            autoFocus={!initialQuery}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button type="submit" className={styles.submitButton}>
          <span>Lookup Athlete</span>
          <ArrowRight size={16} />
        </button>
      </form>

      {/* Quick Access Verified Athlete Demo Chips */}
      <div className={styles.quickAccessRow}>
        <span className={styles.quickAccessLabel}>
          <UserCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
          QUICK ACCESS DEMO ATHLETES:
        </span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/my-result?q=1001" className={styles.quickChip}>
            <strong style={{ color: "#f59e0b" }}>#1001</strong>
            <span>Participant One • Gold</span>
          </Link>
          <Link href="/my-result?q=1002" className={styles.quickChip}>
            <strong style={{ color: "#cbd5e1" }}>#1002</strong>
            <span>Participant Two • Silver</span>
          </Link>
          <Link href="/my-result?q=1003" className={styles.quickChip}>
            <strong style={{ color: "#38bdf8" }}>#1003</strong>
            <span>Participant Three • Toofan</span>
          </Link>
          <Link href="/my-result?q=1004" className={styles.quickChip}>
            <strong style={{ color: "#a855f7" }}>#1004</strong>
            <span>Participant Four • Trojan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
