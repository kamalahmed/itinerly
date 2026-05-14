import Link from "next/link";
import { Plane } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-4 w-4" />
          </span>
          <span>
            itinerly<span className="text-primary">.</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link
            href="/flights"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Popular routes
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            How it works
          </Link>
          <Link
            href="/search"
            className="rounded-md bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search flights
          </Link>
        </nav>
      </div>
    </header>
  );
}
