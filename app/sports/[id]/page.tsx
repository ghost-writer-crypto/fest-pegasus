import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sports } from "@/data/sports";
import { events } from "@/data/events";
import { venues } from "@/data/venues";
import SportArenaClient from "@/components/sports/SportArenaClient";
import Footer from "@/components/Footer";

type SportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: SportPageProps): Promise<Metadata> {
  const { id } = await params;
  const sport = sports.find(
    (item) =>
      item.id.toLowerCase() === id.toLowerCase() ||
      item.slug?.toLowerCase() === id.toLowerCase(),
  );

  if (!sport) {
    return {
      title: "Discipline Arena Not Found — ZENITHROW 2026",
    };
  }

  return {
    title: `${sport.name} Arena — ZENITHROW Sports Festival 2026`,
    description: sport.description || `Official ${sport.name} draws, fixtures, division eligibility, and championship points for ZENITHROW Sports Festival 2026.`,
    openGraph: {
      title: `${sport.name} Arena — ZENITHROW Sports Festival 2026`,
      description: sport.description || `Official ${sport.name} draws, fixtures, division eligibility, and championship points for ZENITHROW Sports Festival 2026.`,
    },
  };
}

export default async function SportPage({ params }: SportPageProps) {
  const { id } = await params;

  const sport = sports.find(
    (item) =>
      item.id.toLowerCase() === id.toLowerCase() ||
      item.slug?.toLowerCase() === id.toLowerCase(),
  );

  if (!sport) {
    notFound();
  }

  const sportEvents = events.filter(
    (event) =>
      event.sport.toLowerCase() === sport.name.toLowerCase() ||
      event.sport.toLowerCase() === sport.id.toLowerCase() ||
      (sport.slug && event.sport.toLowerCase() === sport.slug.toLowerCase()),
  );

  const venue = venues.find((v) => v.id === sport.venueId);

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "var(--hsu-bg, #070707)",
          color: "var(--hsu-text, #ffffff)",
          paddingBottom: "80px",
        }}
      >
        <SportArenaClient sport={sport} events={sportEvents} venue={venue} />
      </main>
      <Footer />
    </>
  );
}