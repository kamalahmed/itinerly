"use client";

import * as React from "react";
import { CreditCard, Lock } from "lucide-react";
import { confirmBooking } from "@/app/booking/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Mock payment screen — no network call, no real charge. itinerly is free for
 * now; this collects nothing real and just simulates a 1.5s processing delay
 * before advancing to the confirmation page.
 */
export function PaymentForm({ bookingId }: { bookingId: string }) {
  const [processing, setProcessing] = React.useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500));
    await confirmBooking(bookingId);
  }

  return (
    <form onSubmit={pay} className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 font-semibold">
        <CreditCard className="h-4 w-4 text-primary" />
        Payment
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        itinerly is free while in beta — this is a mock payment screen. No card
        is charged and nothing is sent over the network.
      </p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label>Cardholder name</Label>
          <Input placeholder="MD RAHMAN AHMED" disabled={processing} />
        </div>
        <div className="space-y-1.5">
          <Label>Card number</Label>
          <Input
            placeholder="4242 4242 4242 4242"
            inputMode="numeric"
            disabled={processing}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Expiry</Label>
            <Input placeholder="MM/YY" disabled={processing} />
          </div>
          <div className="space-y-1.5">
            <Label>CVC</Label>
            <Input placeholder="123" disabled={processing} />
          </div>
        </div>
      </div>

      <Button type="submit" className="mt-4 w-full" disabled={processing}>
        <Lock className="h-4 w-4" />
        {processing ? "Processing…" : "Pay & generate itinerary"}
      </Button>
    </form>
  );
}
