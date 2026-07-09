import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "../components/NavBar";

export const metadata: Metadata = {
  title: "CaseWeave - Case Loom Console",
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col paper-texture bg-ink text-paper">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
