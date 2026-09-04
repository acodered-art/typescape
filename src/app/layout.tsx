import type { Metadata } from "next";
import { Big_Shoulders, Courier_Prime, Public_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { FloatingAddButton } from "@/components/floating-add-button";
import { InkFilter } from "@/components/dossier";

// Printed face: labels, headings, names, the wordmark, the stamp.
// Google now ships Big Shoulders as one variable family with an optical-size axis;
// globals.css pins "opsz" 72 on display text so it renders as the old Display cut at every size.
const display = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});
// Typed face: codes, field values, counts, small buttons. It means "typed by a reader".
const typed = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});
// Running text.
const body = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang="en" className={`${display.variable} ${typed.variable} ${body.variable}`}>
      <body className="min-h-screen bg-ink font-body text-paper">
        <InkFilter />
        <Header />
        {/* The page is a 1100px desk: 40px padding either side of 1020px of content. */}
        <main className="mx-auto w-full max-w-[1100px] px-4 pb-10 sm:px-10">{children}</main>
        <FloatingAddButton />
      </body>
    </html>
  );
}
