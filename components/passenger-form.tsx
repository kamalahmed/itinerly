"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, UserRound } from "lucide-react";
import { savePassengers } from "@/app/booking/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const passengerSchema = z.object({
  title: z.enum(["Mr", "Ms", "Mrs", "Mstr", "Miss"]),
  fullName: z
    .string()
    .min(2, "Enter the full name as in the passport")
    .max(80),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker"),
  nationality: z.string().min(2, "Required").max(40),
  passportNumber: z
    .string()
    .min(5, "Enter a valid passport number")
    .max(20),
  passportExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker"),
});

const formSchema = z.object({
  passengers: z.array(passengerSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

const emptyPassenger = {
  title: "Mr" as const,
  fullName: "",
  dob: "",
  nationality: "Bangladeshi",
  passportNumber: "",
  passportExpiry: "",
};

export function PassengerForm({ bookingId }: { bookingId: string }) {
  const [submitting, setSubmitting] = React.useState(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { passengers: [emptyPassenger] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    await savePassengers(bookingId, values.passengers);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field, i) => {
        const err = errors.passengers?.[i];
        const title = watch(`passengers.${i}.title`);
        return (
          <div key={field.id} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold">
                <UserRound className="h-4 w-4 text-primary" />
                Passenger {i + 1}
              </p>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Select
                  value={title}
                  onValueChange={(v) =>
                    setValue(
                      `passengers.${i}.title`,
                      v as FormValues["passengers"][number]["title"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Mr", "Ms", "Mrs", "Miss", "Mstr"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Full name (as in passport)</Label>
                <Input
                  {...register(`passengers.${i}.fullName`)}
                  placeholder="MD RAHMAN AHMED"
                />
                {err?.fullName && (
                  <p className="text-xs text-destructive">
                    {err.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Date of birth</Label>
                <Input type="date" {...register(`passengers.${i}.dob`)} />
                {err?.dob && (
                  <p className="text-xs text-destructive">
                    {err.dob.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input
                  {...register(`passengers.${i}.nationality`)}
                  placeholder="Bangladeshi"
                />
                {err?.nationality && (
                  <p className="text-xs text-destructive">
                    {err.nationality.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Passport number</Label>
                <Input
                  {...register(`passengers.${i}.passportNumber`)}
                  placeholder="A01234567"
                  className="uppercase"
                />
                {err?.passportNumber && (
                  <p className="text-xs text-destructive">
                    {err.passportNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Passport expiry</Label>
                <Input
                  type="date"
                  {...register(`passengers.${i}.passportExpiry`)}
                />
                {err?.passportExpiry && (
                  <p className="text-xs text-destructive">
                    {err.passportExpiry.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ ...emptyPassenger })}
        >
          <Plus className="h-4 w-4" />
          Add passenger
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Continue to payment"}
        </Button>
      </div>
    </form>
  );
}
