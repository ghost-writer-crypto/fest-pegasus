import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pegasus Display — Stadium Screen System",
  description: "High-impact full-screen display system for stadium screens and venue projectors",
};

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pegasus-display-shell">
      {children}
    </div>
  );
}

