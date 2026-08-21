"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function SiteSwitcher({
  sites,
  activeSiteId,
}: {
  sites: Array<{ id: string; name: string; role: string }>;
  activeSiteId: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const changeSite = async (siteId: string) => {
    if (siteId === "__manage") {
      router.push("/admin/sites");
      return;
    }
    setSwitching(true);
    const response = await fetch("/api/admin/site", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    if (!response.ok) {
      toast.error("You do not have access to that site");
      setSwitching(false);
      return;
    }
    window.location.assign("/admin");
  };
  return (
    <Select
      value={activeSiteId}
      disabled={switching}
      onValueChange={(value) => void changeSite(value)}
    >
      <SelectTrigger className="w-full" aria-label="Active site">
        <SelectValue placeholder="Choose a site" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Your sites</SelectLabel>
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              {site.name}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectItem value="__manage">
            <Plus data-icon="inline-start" />
            Manage sites
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
