"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PinInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export const PinInput = React.forwardRef<HTMLDivElement, PinInputProps>(
  (
    {
      length = 4,
      value,
      onChange,
      autoFocus = false,
      disabled = false,
      name,
      id,
    },
    ref,
  ) => {
    const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
    const digits = Array.from({ length }, (_, i) => value[i] ?? "");

    React.useEffect(() => {
      if (autoFocus) inputsRef.current[0]?.focus();
    }, [autoFocus]);

    function setDigit(index: number, digit: string) {
      const arr = digits.slice();
      arr[index] = digit;
      onChange(arr.join("").slice(0, length));
    }

    function handleChange(
      e: React.ChangeEvent<HTMLInputElement>,
      index: number,
    ) {
      const raw = e.target.value.replace(/\D/g, "");
      if (!raw) {
        setDigit(index, "");
        return;
      }
      if (raw.length > 1) {
        // El usuario pegó un PIN completo
        const next = raw.slice(0, length);
        onChange(next);
        const focusIdx = Math.min(next.length, length - 1);
        inputsRef.current[focusIdx]?.focus();
        return;
      }
      setDigit(index, raw[0]);
      if (index < length - 1) inputsRef.current[index + 1]?.focus();
    }

    function handleKeyDown(
      e: React.KeyboardEvent<HTMLInputElement>,
      index: number,
    ) {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigit(index - 1, "");
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputsRef.current[index - 1]?.focus();
        e.preventDefault();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
        e.preventDefault();
      }
    }

    return (
      <div ref={ref} className="flex gap-3 justify-center" id={id}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={1}
            value={d}
            disabled={disabled}
            style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={`PIN dígito ${i + 1} de ${length}`}
            className={cn(
              "h-14 w-14 sm:h-16 sm:w-16 text-center text-2xl font-semibold",
              "rounded-[var(--radius-md)] border border-[var(--color-border-strong)]",
              "bg-[var(--color-surface)] text-[var(--color-text)]",
              "transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2",
              "disabled:opacity-50",
              "tabular-nums",
            )}
          />
        ))}
        {name && (
          <input type="hidden" name={name} value={value} />
        )}
      </div>
    );
  },
);
PinInput.displayName = "PinInput";
