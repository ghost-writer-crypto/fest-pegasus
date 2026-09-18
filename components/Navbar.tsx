"use client";

import Link from "next/link";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Sports", href: "/sports" },
  { label: "Schedules", href: "/schedules" },
  { label: "Results", href: "/results" },
  { label: "Participants", href: "/participants" },
  { label: "Teams", href: "/teams" },
  { label: "Downloads", href: "/downloads" },
  { label: "Wall", href: "/wall" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-black tracking-[0.2em] text-white"
        >
          PEGASUS
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          href="/my-result"
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-white/50 hover:bg-white hover:text-black"
        >
          My Result
        </Link>
      </nav>
    </header>
  );
}
