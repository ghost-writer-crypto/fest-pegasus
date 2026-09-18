import { festival } from "@/data/festival";
import { sports } from "@/data/sports";
import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F8F8F6]">
      {/* Navigation */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="text-lg font-semibold tracking-[0.25em]">
            PEGASUS
          </div>

          <nav className="hidden gap-8 text-sm text-white/60 md:flex">
            <Link href="/sports" className="transition hover:text-white">
              Sports
              </Link>
            <Link href="#schedule" className="transition hover:text-white">
              Schedule
            </Link>
            <a href="#results" className="transition hover:text-white">
              Results
            </a>
            <a href="#teams" className="transition hover:text-white">
              Teams
            </a>
          </nav>

          <button className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black">
            Explore
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex min-h-[78vh] max-w-7xl items-center px-6 py-24 lg:px-10">
          <div className="max-w-4xl">
            <p className="mb-6 text-sm uppercase tracking-[0.35em] text-white/40">
              The Sports Festival
            </p>

            <h1 className="text-6xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-7xl lg:text-9xl">
              Rise.
              <br />
              Compete.
              <br />
              <span className="text-white/40">Transcend.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              One arena. Four teams. Hundreds of athletes.
              <br />
              Welcome to Pegasus.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
  href="/sports"
  className="rounded-full bg-[#F8F8F6] px-6 py-3 text-sm font-medium text-black transition hover:scale-[1.02]"
>
   Explore Sports
      </Link>

              <a
                href="#schedule"
                className="rounded-full border border-white/20 px-6 py-3 text-sm transition hover:bg-white/10"
              >
                View Schedule
              </a>
            </div>
          </div>
        </div>

        {/* Atmospheric glow */}
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl" />
      </section>

      {/* Stats */}
<section className="border-y border-white/10">
  <div className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
    {[
  [`${festival.stats.events}+`, "Events"],
  [`${festival.stats.teams}`, "Teams"],
  [`${festival.stats.athletes}`, "Athletes"],
  [`${festival.stats.categories}`, "Categories"],
].map(([value, label]) => (
      <div
        key={label}
        className="border-r border-white/10 px-6 py-10 last:border-r-0 lg:px-10"
      >
              <p className="text-4xl font-semibold tracking-tight">{value}</p>
              <p className="mt-2 text-sm text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </section>

           {/* Sports */}
      <section
        id="sports"
        className="mx-auto max-w-7xl px-6 py-28 lg:px-10"
      >
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-white/35">
            Discover
          </p>

          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Every game.
            <br />
            Every moment.
          </h2>

          <p className="mt-6 leading-7 text-white/50">
            Explore the sports, events and competitions that make Pegasus
            happen.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport, index) => (
            <div
              key={sport.id}
              className="group min-h-52 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.07]"
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="text-xs uppercase tracking-wider text-white/25">
                    {sport.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-medium">
                    {sport.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    {sport.description}
                  </p>

                  <p className="mt-4 text-xs text-white/25">
                    {sport.events.length} events
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-white/35 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span>PEGASUS</span>
          <span>Built for the spirit of competition.</span>
        </div>
      </footer>
    </main>
  );
}