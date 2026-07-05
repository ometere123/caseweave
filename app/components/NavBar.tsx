"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/agreements", label: "Docket" },
  { href: "/cases", label: "Precedent Library" },
  { href: "/graph", label: "Graph" },
  { href: "/appeals", label: "Appeals" },
  { href: "/profile", label: "Profile" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line/50 bg-charcoal/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="font-display text-xl tracking-wide text-gold">
          <span className="flex items-center gap-3">
            <Image
              src="/caseweave-logo.svg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl"
              priority
            />
            <span>CaseWeave</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-mono text-muted">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname?.startsWith(link.href)
                  ? "text-paper"
                  : "hover:text-paper transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}
