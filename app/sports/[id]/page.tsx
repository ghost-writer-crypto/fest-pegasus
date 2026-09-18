 import { sports } from "@/data/sports";
import Link from "next/link";

type SportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SportPage({
  params,
}: SportPageProps) {
  const { id } = await params;

  const sport = sports.find((item) => item.id === id);

  if (!sport) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-[#F8F8F6]">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-white/30">
            Pegasus
          </p>

          <h1 className="mt-4 text-5xl font-semibold">
            Sport not found
          </h1>

          <Link
            href="/sports"
            className="mt-8 inline-block rounded-full bg-[#F8F8F6] px-6 py-3 text-sm font-medium text-black"
          >
            Back to Sports
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F8F8F6]">

      {/* Navigation */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">

          <Link
            href="/"
            className="text-lg font-semibold tracking-[0.25em]"
          >
            PEGASUS
          </Link>

          <nav className="hidden gap-8 text-sm text-white/60 md:flex">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>

            <Link href="/sports" className="text-white">
              Sports
            </Link>

            <span className="text-white/30">
              Schedule
            </span>

            <span className="text-white/30">
              Results
            </span>

            <span className="text-white/30">
              Teams
            </span>
          </nav>

          <Link
            href="/sports"
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            All Sports
          </Link>

        </div>
      </header>


      {/* Sport Hero */}
      <section className="relative overflow-hidden border-b border-white/10">

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">

          <Link
            href="/sports"
            className="text-sm text-white/35 transition hover:text-white"
          >
            ← All Sports
          </Link>

          <div className="mt-12 max-w-5xl">

            <p className="text-sm uppercase tracking-[0.35em] text-white/35">
              {sport.category}
            </p>

            <h1 className="mt-5 text-7xl font-semibold leading-[0.9] tracking-[-0.05em] sm:text-8xl lg:text-[10rem]">
              {sport.name}
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-white/50">
              {sport.description}
            </p>

          </div>

        </div>

        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />

      </section>


      {/* EVENTS */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">

        <div className="flex items-end justify-between">

          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/30">
              Competition
            </p>

            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Events
            </h2>
          </div>

          <span className="text-sm text-white/30">
            {sport.events.length}{" "}
            {sport.events.length === 1 ? "event" : "events"}
          </span>

        </div>


        {/* EVENT LIST */}
        <div className="mt-12 divide-y divide-white/10 border-y border-white/10">

          {sport.events.map((event, index) => (

            <div
              key={event}
              className="flex items-center justify-between py-6"
            >

              <div className="flex items-center gap-6">

                <span className="text-sm text-white/25">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3 className="text-xl font-medium sm:text-2xl">
                  {event}
                </h3>

              </div>

              <span className="text-sm text-white/25">
                →
              </span>

            </div>

          ))}

        </div>

      </section>


      {/* Footer */}
      <footer className="border-t border-white/10">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between lg:px-10">

          <span>
            PEGASUS
          </span>

          <span>
            Built for the spirit of competition.
          </span>

        </div>

      </footer>

    </main>
  );
}