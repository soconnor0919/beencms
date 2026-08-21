"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "~/components/ThemeToggle";

export default function MobileNav({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open]);
  return <div className="md:hidden"><button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-md border">{open ? <X /> : <Menu />}</button>{open ? <div id="mobile-navigation" className="absolute inset-x-0 top-full border-b bg-background p-6 shadow-lg"><nav className="mx-auto flex max-w-6xl flex-col gap-1">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 font-medium hover:bg-muted">{link.label}</Link>)}<div className="mt-3 flex items-center justify-between border-t px-3 pt-4"><span className="text-sm text-muted-foreground">Appearance</span><ThemeToggle /></div></nav></div> : null}</div>;
}
