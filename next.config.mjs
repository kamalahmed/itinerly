/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Force HTTPS for two years, including subdomains. Vercel terminates TLS,
  // so this is safe in prod; harmless on http://localhost (browsers ignore it).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Don't let browsers MIME-sniff responses away from their declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow framing to prevent clickjacking of the booking flow.
  { key: "X-Frame-Options", value: "DENY" },
  // Only send the origin (not the full path/query) on cross-origin requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app needs none of these powerful features.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
