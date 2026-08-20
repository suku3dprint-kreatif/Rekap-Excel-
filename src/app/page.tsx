"use client";

import { useMemo } from "react";
import { Stepper } from "@/components/wizard/Stepper";
import { Step1Upload } from "@/components/wizard/Step1Upload";
import { Step2Mapping } from "@/components/wizard/Step2Mapping";
import { Step3Cleaning } from "@/components/wizard/Step3Cleaning";
import { Step4Results } from "@/components/wizard/Step4Results";
import { Button } from "@/components/ui/Button";
import { buildOutput, type SourceSheetInput } from "@/lib/pipeline";
import type { UploadedFileState } from "@/lib/types";
import { useWizardState, type WizardStep } from "@/state/useWizardState";

function buildSources(files: UploadedFileState[]): SourceSheetInput[] {
  const out: SourceSheetInput[] = [];
  for (const f of files) {
    if (f.status !== "parsed") continue;
    for (const s of f.sheets) {
      if (!s.selected) continue;
      out.push({ fileId: f.id, fileName: f.name, sheetName: s.sheetName, sheet: s });
    }
  }
  return out;
}

export default function Home() {
  const { state, dispatch } = useWizardState();

  const sources = useMemo(() => buildSources(state.files), [state.files]);

  const hasMappedColumn = state.schema.mappings.some((m) => m.targetColumnId !== null);

  const canGoStep2 = sources.length > 0;
  const canGoStep3 = state.schema.targetColumns.length > 0 && hasMappedColumn;

  const processResult = useMemo(() => {
    if (!canGoStep3) return null;
    return buildOutput(sources, state.schema, state.cleaningOptions);
  }, [sources, state.schema, state.cleaningOptions, canGoStep3]);

  const canGoStep4 = processResult !== null;

  const maxReached: WizardStep = canGoStep4 ? 4 : canGoStep3 ? 3 : canGoStep2 ? 2 : 1;

  function goNext() {
    if (state.step === 1 && canGoStep2) dispatch({ type: "GO_TO_STEP", step: 2 });
    else if (state.step === 2 && canGoStep3) dispatch({ type: "GO_TO_STEP", step: 3 });
    else if (state.step === 3 && canGoStep4) dispatch({ type: "GO_TO_STEP", step: 4 });
  }

  function goBack() {
    if (state.step > 1) dispatch({ type: "GO_TO_STEP", step: (state.step - 1) as WizardStep });
  }

  const nextEnabled =
    (state.step === 1 && canGoStep2) || (state.step === 2 && canGoStep3) || (state.step === 3 && canGoStep4);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Rekap Cepat</h1>
        <p className="text-sm text-neutral-500">
          Gabungkan &amp; rapikan file Excel/CSV dari berbagai unit — langsung di browser Anda.
        </p>
      </header>

      <nav className="rounded border border-neutral-200 bg-white px-2 py-2 sm:px-4">
        <Stepper current={state.step} maxReached={maxReached} onJump={(s) => dispatch({ type: "GO_TO_STEP", step: s })} />
      </nav>

      <main className="flex-1 rounded border border-neutral-200 bg-neutral-50/40 p-4 sm:p-6">
        {state.step === 1 && <Step1Upload files={state.files} dispatch={dispatch} />}
        {state.step === 2 && <Step2Mapping files={state.files} schema={state.schema} dispatch={dispatch} />}
        {state.step === 3 && (
          <Step3Cleaning
            schema={state.schema}
            cleaningOptions={state.cleaningOptions}
            sources={sources}
            processResult={processResult}
            dispatch={dispatch}
          />
        )}
        {state.step === 4 && processResult && (
          <Step4Results processResult={processResult} pivotConfig={state.pivotConfig} dispatch={dispatch} />
        )}
      </main>

      <footer className="flex items-center justify-between gap-3 pb-4">
        <Button variant="ghost" type="button" onClick={goBack} disabled={state.step === 1}>
          ← Kembali
        </Button>
        <span className="text-xs text-neutral-400">Langkah {state.step} dari 4</span>
        {state.step < 4 ? (
          <Button variant="primary" type="button" onClick={goNext} disabled={!nextEnabled}>
            Lanjut →
          </Button>
        ) : (
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              const ok = confirm("Mulai proses baru? Semua data saat ini di browser akan dihapus.");
              if (ok) dispatch({ type: "RESET_FILES_AND_SCHEMA" });
            }}
          >
            Mulai baru
          </Button>
        )}
      </footer>
    </div>
  );
}
