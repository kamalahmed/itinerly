import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">
            itinerly<span className="text-primary">.</span>
          </p>
          <p className="mt-1 max-w-md text-xs">
            Flight itinerary documents for visa applications. itinerly produces
            a sample itinerary PDF — it is not a confirmed airline booking.
          </p>
        </div>
        <nav className="flex gap-4">
          <Link href="/flights" className="hover:text-foreground">
            Routes
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/search" className="hover:text-foreground">
            Search
          </Link>
        </nav>
      </div>
      <div className="border-t py-3">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} itinerly.app — for visa application
          purposes only.
        </p>
      </div>
    </footer>
  );
}
