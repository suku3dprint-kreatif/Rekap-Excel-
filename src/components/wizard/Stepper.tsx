"use client";

import { cn } from "@/lib/cn";
import type { WizardStep } from "@/state/useWizardState";

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Unggah" },
  { step: 2, label: "Pemetaan" },
  { step: 3, label: "Pembersihan" },
  { step: 4, label: "Hasil" },
];

export function Stepper({
  current,
  maxReached,
  onJump,
}: {
  current: WizardStep;
  maxReached: WizardStep;
  onJump: (step: WizardStep) => void;
}) {
  return (
    <ol className="flex w-full items-center gap-1 sm:gap-2">
      {STEPS.map(({ step, label }, idx) => {
        const active = step === current;
        const reachable = step <= maxReached;
        return (
          <li key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(step)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-2 text-left transition-colors sm:px-3",
                active ? "bg-accent-50" : reachable ? "hover:bg-neutral-100" : "opacity-40",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  active
                    ? "bg-accent-600 text-white"
                    : reachable
                      ? "bg-neutral-200 text-neutral-700"
                      : "bg-neutral-100 text-neutral-400",
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  active ? "text-accent-700" : "text-neutral-600",
                )}
              >
                {label}
              </span>
            </button>
            {idx < STEPS.length - 1 && <span className="h-px w-2 shrink-0 bg-neutral-300 sm:w-4" />}
          </li>
        );
      })}
    </ol>
  );
}
