"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type AppearanceTheme = "light" | "dark" | "system";

const OPTIONS: { value: AppearanceTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selectedTheme: AppearanceTheme = mounted && OPTIONS.some((option) => option.value === theme)
    ? theme as AppearanceTheme
    : "system";
  const TriggerIcon = mounted && resolvedTheme === "dark" ? Moon : mounted && resolvedTheme === "light" ? Sun : Laptop;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" aria-label="Choose appearance theme" title={`Theme: ${selectedTheme}`} suppressHydrationWarning>
          <TriggerIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selectedTheme} onValueChange={(value) => setTheme(value)}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <option.icon />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
