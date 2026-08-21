"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type PrivacyNavigator = Navigator & { globalPrivacyControl?: boolean };

function optedOut() {
  const navigatorWithPrivacy = navigator as PrivacyNavigator;
  return (
    navigator.doNotTrack === "1" ||
    navigatorWithPrivacy.globalPrivacyControl === true
  );
}

function send(event: {
  kind: "pageview" | "outbound_click";
  path: string;
  name?: string;
  referrer?: string;
}) {
  if (optedOut()) return;
  const body = JSON.stringify(event);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/analytics", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
  });
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    send({ kind: "pageview", path: pathname, referrer: document.referrer });
  }, [pathname]);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin) return;
      send({
        kind: "outbound_click",
        path: window.location.pathname,
        name: url.hostname,
      });
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, { capture: true });
  }, []);
  return null;
}
