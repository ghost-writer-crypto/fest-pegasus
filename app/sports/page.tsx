import { sports } from "@/data/sports";
import Link from "next/link";

export default function SportsPage() {
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

            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/sports"
              className="text-white"
            >
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
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Home
          </Link>

        </div>
      </header>


      {/* Hero */}
      <section className="relative overflow-hidden">

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">

          <div className="max-w-4xl">

            <p className="text-sm uppercase tracking-[0.35em] text-white/35">
              Pegasus Sports
            </p>

            <h1 className="mt-6 text-6xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-7xl lg:text-9xl">
              The games.
              <br />
              <span className="text-white/40">
                The arena.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-white/50 sm:text-lg">
              Explore every sport, every event and every
              opportunity to compete at Pegasus.
            </p>

          </div>

        </div>

        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />

      </section>


      {/* Sports Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-10">

        <div className="mb-10 flex items-end justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-white/30">
              Explore
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              All Sports
            </h2>

          </div>

          <p className="hidden text-sm text-white/30 sm:block">
            {sports.length} sports
          </p>

        </div>


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {sports.map((sport, index) => (

            <Link
              key={sport.id}
              href={`/sports/${sport.id}`}
              className="group block"
            >

              <article
                className="min-h-72 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07]"
              >

                <div className="flex h-full flex-col justify-between">

                  {/* Top */}
                  <div className="flex items-center justify-between">

                    <span className="text-sm text-white/25">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/35">
                      {sport.category}
                    </span>

                  </div>


                  {/* Bottom */}
                  <div>

                    <h3 className="text-3xl font-medium tracking-tight">
                      {sport.name}
                    </h3>

                    <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
                      {sport.description}
                    </p>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">

                      <span className="text-xs text-white/30">
                        {sport.events.length}{" "}
                        {sport.events.length === 1
                          ? "event"
                          : "events"}
                      </span>

                      <span className="text-xs text-white/40 transition group-hover:text-white">
                        Explore →
                      </span>

                    </div>

                  </div>

                </div>

              </article>

            </Link>

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