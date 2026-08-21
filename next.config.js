/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const production = process.env.NODE_ENV === "production";
const scriptPolicy = production
  ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com";
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(production
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: blob: https:; media-src 'self' https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ${scriptPolicy}; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com`,
  },
];

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default config;
