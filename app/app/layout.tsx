import type { Metadata } from "next";
import { Libre_Baskerville, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "../components/NavBar";

const display = Libre_Baskerville({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CaseWeave — Case Loom Console",
  description:
    "A living common-law layer for web3 agreements, powered by GenLayer.",
  icons: {
    icon: "/caseweave-logo.svg",
    shortcut: "/caseweave-logo.svg",
    apple: "/caseweave-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col paper-texture bg-ink text-paper">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
