import type { Metadata } from "next";
import { sports } from "@/data/sports";
import { events } from "@/data/events";
import { venues } from "@/data/venues";
import SportsDirectoryClient from "@/components/sports/SportsDirectoryClient";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Sports & Disciplines — ZENITHROW Sports Festival 2026",
  description:
    "Official directory of championship sports, medal draws, division rosters, and point matrices for ZENITHROW Sports Festival 2026.",
  openGraph: {
    title: "Sports & Disciplines — ZENITHROW Sports Festival 2026",
    description:
      "Explore certified festival sports, medal events, division eligibility, official roster quotas, and championship point distributions across all collegiate houses.",
  },
};

export default function SportsPage() {
  return (
    <>
      <main style={{ minHeight: "100vh", background: "var(--hsu-bg, #070707)", color: "var(--hsu-text, #ffffff)" }}>
        <SportsDirectoryClient sports={sports} events={events} venues={venues} />
      </main>
      <Footer />
    </>
  );
}