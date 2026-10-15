import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ZENITHROW — Sports Festival 2026",
  description: "Official Championship Operating System for ZENITHROW Sports Festival 2026",
  openGraph: {
    title: "ZENITHROW — Sports Festival 2026",
    description: "Official Championship Operating System for ZENITHROW Sports Festival 2026",
    siteName: "ZENITHROW",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={cn("font-sans", geist.variable)} style={{ colorScheme: "dark" }}>
      <body>
        <ThemeProvider>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}