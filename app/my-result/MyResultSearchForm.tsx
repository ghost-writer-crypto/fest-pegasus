"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";
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
            placeholder="Search by Chest Number or Athlete ID..."
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
    </div>
  );
}
