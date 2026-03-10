import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - /api routes
    // - /_next (Next.js internals)
    // - /favicon.ico, sitemap.xml, robots.txt (static files)
    "/((?!api|_next|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
