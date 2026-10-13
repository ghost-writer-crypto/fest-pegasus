import type { Metadata } from "next";
import { sports } from "@/data/sports";
import { events } from "@/data/events";
import { venues } from "@/data/venues";
import SportsDirectoryClient from "@/components/sports/SportsDirectoryClient";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Sports & Disciplines — ZENITHROW Sports Festival 2026",
  description:
    "Official directory of championship sports, medal draws, division rosters, and tournament venues for ZENITHROW Sports Festival 2026.",
  openGraph: {
    title: "Sports & Disciplines — ZENITHROW Sports Festival 2026",
    description:
      "Explore certified festival sports, medal events, division eligibility, official roster quotas, and tournament draws across all collegiate teams.",
  },
};

export default function SportsPage() {
  return (
    <>
      <main style={{ minHeight: "100vh", background: "var(--hsu-bg, #070707)", color: "var(--hsu-text, #ffffff)" }}>
        <Reveal>
          <SportsDirectoryClient sports={sports} events={events} venues={venues} />
        </Reveal>
      </main>
      <Footer />
    </>
  );
}