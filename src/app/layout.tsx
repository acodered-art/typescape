import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { FloatingAddButton } from "@/components/floating-add-button";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TypeScape — The Personality Database",
  description: "Discover, rate, and debate personality types for fictional characters, celebrities, and more. Community-driven MBTI, Enneagram, Big Five, and more.",
  openGraph: {
    title: "TypeScape",
    description: "Community-driven personality database for characters and celebrities.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} font-mono bg-[#0a0e17] text-[#c8d0dc] min-h-screen`}>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <FloatingAddButton />
      </body>
    </html>
  );
}