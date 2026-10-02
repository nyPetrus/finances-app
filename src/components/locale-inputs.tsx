"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brDateToISO, formatBRNumberInput, isoToBRDate, parseBRNumber } from "@/lib/locale-format";

// Form fields that read and write Brazilian formats (see lib/locale-format)
// in place of native number/date inputs. The visible text field has no
// `name`; a hidden input carries the canonical value under `name`, so server
// actions keep receiving "-1234.56" / "2026-10-05". Invalid text blocks the
// form's submit via setCustomValidity.

type AmountInputProps = {
  id?: string;
  name: string;
  defaultValue?: number | null;
  // Money amounts pad to two decimals; budget cells show plain numbers.
  fixed?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
};

export function AmountInput({ name, defaultValue, fixed = true, required, ...props }: AmountInputProps) {
  const [text, setText] = useState(
    defaultValue === null || defaultValue === undefined ? "" : formatBRNumberInput(defaultValue, { fixed }),
  );
  const ref = useRef<HTMLInputElement>(null);
  const value = parseBRNumber(text);
  const invalid = text.trim() !== "" && value === null;

  useEffect(() => {
    ref.current?.setCustomValidity(invalid ? "Use comma for decimals, e.g. -50,00" : "");
  }, [invalid]);

  return (
    <>
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        required={required}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={invalid || undefined}
      />
      <input type="hidden" name={name} value={value === null ? "" : String(value)} />
    </>
  );
}

// Same "05/10/2026" shape as typed: digits only, slashes inserted as you go.
function maskDate(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `/${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `/${digits.slice(4)}`;
  return out;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function DateInput({
  id,
  name,
  defaultValue,
  required,
}: {
  id?: string;
  name: string;
  // ISO "2026-10-05".
  defaultValue?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(defaultValue ? isoToBRDate(defaultValue) : "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const iso = brDateToISO(text);
  const invalid = text.trim() !== "" && iso === null;

  useEffect(() => {
    ref.current?.setCustomValidity(invalid ? "Use dd/mm/aaaa, e.g. 05/10/2026" : "");
  }, [invalid]);

  const selected = iso ? new Date(`${iso}T00:00:00`) : undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        required={required}
        value={text}
        onChange={(e) => setText(maskDate(e.target.value))}
        aria-invalid={invalid || undefined}
        className="pr-8"
      />
      <input type="hidden" name={name} value={iso ?? ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
              aria-label="Pick a date"
              title="Pick a date"
            />
          }
        >
          <CalendarIcon />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto">
          <Calendar
            mode="single"
            className="bg-transparent p-0"
            selected={selected}
            defaultMonth={selected ?? new Date()}
            onSelect={(date) => {
              if (!date) return;
              setText(`${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
