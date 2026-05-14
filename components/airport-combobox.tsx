"use client";

import * as React from "react";
import { Check, MapPin, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Airport } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AirportComboboxProps {
  value?: Airport;
  onChange: (airport: Airport) => void;
  placeholder?: string;
  icon?: "origin" | "destination";
}

export function AirportCombobox({
  value,
  onChange,
  placeholder = "Select airport",
  icon = "origin",
}: AirportComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Airport[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.airports ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start gap-2 text-left font-normal"
        >
          <Plane
            className={cn(
              "h-4 w-4 shrink-0 text-primary",
              icon === "destination" && "rotate-90"
            )}
          />
          {value ? (
            <span className="truncate">
              <span className="font-semibold">{value.iata}</span>{" "}
              <span className="text-muted-foreground">· {value.city}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="City or airport code…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!loading && query.length > 0 && results.length === 0 && (
              <CommandEmpty>No airports found.</CommandEmpty>
            )}
            {!loading && query.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type a city or airport code
              </div>
            )}
            <CommandGroup>
              {results.map((a) => (
                <CommandItem
                  key={a.iata}
                  value={a.iata}
                  onSelect={() => {
                    onChange(a);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {a.city}{" "}
                      <span className="text-muted-foreground">
                        ({a.iata})
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.name} · {a.country}
                    </div>
                  </div>
                  {value?.iata === a.iata && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
