"use client";

import { useReducer } from "react";
import type {
  CleaningOptions,
  MappingSchema,
  PivotConfig,
  ProcessResult,
  SheetSelection,
  TargetColumn,
  UploadedFileState,
} from "@/lib/types";

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardState {
  step: WizardStep;
  files: UploadedFileState[];
  schema: MappingSchema;
  cleaningOptions: CleaningOptions;
  processResult: ProcessResult | null;
  pivotConfig: PivotConfig;
}

export type WizardAction =
  | { type: "ADD_FILES"; entries: { id: string; file: File }[] }
  | { type: "SET_FILE_PARSING"; fileId: string }
  | { type: "SET_FILE_PARSED"; fileId: string; sheets: SheetSelection[] }
  | { type: "SET_FILE_ERROR"; fileId: string; error: string }
  | { type: "REMOVE_FILE"; fileId: string }
  | { type: "TOGGLE_SHEET"; fileId: string; sheetName: string }
  | { type: "SET_HEADER_ROW"; fileId: string; sheetName: string; rowIndex: number }
  | { type: "SET_SCHEMA"; schema: MappingSchema }
  | { type: "UPSERT_TARGET_COLUMN"; column: TargetColumn }
  | { type: "REMOVE_TARGET_COLUMN"; id: string }
  | {
      type: "SET_MAPPING";
      fileId: string;
      sheetName: string;
      originalColumn: string;
      targetColumnId: string | null;
    }
  | { type: "SET_CLEANING_OPTIONS"; patch: Partial<CleaningOptions> }
  | { type: "SET_PROCESS_RESULT"; result: ProcessResult }
  | { type: "SET_PIVOT_CONFIG"; patch: Partial<PivotConfig> }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "RESET_FILES_AND_SCHEMA" };

export const initialCleaningOptions: CleaningOptions = {
  trimSpaces: true,
  titleCaseNames: true,
  preserveIdAsText: true,
  normalizeDates: true,
  normalizeNumbers: true,
  removeEmptyRows: true,
  addSourceColumns: true,
  duplicateKeyColumnIds: [],
};

export const initialSchema: MappingSchema = {
  version: 1,
  targetColumns: [],
  mappings: [],
};

const initialState: WizardState = {
  step: 1,
  files: [],
  schema: initialSchema,
  cleaningOptions: initialCleaningOptions,
  processResult: null,
  pivotConfig: { groupByColumnId: null, valueColumnId: null, aggregation: "count" },
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "ADD_FILES": {
      const newFiles: UploadedFileState[] = action.entries.map((e) => ({
        id: e.id,
        file: e.file,
        name: e.file.name,
        size: e.file.size,
        status: "pending",
        sheets: [],
      }));
      return { ...state, files: [...state.files, ...newFiles] };
    }
    case "SET_FILE_PARSING": {
      return {
        ...state,
        files: state.files.map((f) => (f.id === action.fileId ? { ...f, status: "parsing" } : f)),
      };
    }
    case "SET_FILE_PARSED": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.fileId ? { ...f, status: "parsed", sheets: action.sheets } : f,
        ),
      };
    }
    case "SET_FILE_ERROR": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.fileId ? { ...f, status: "error", error: action.error } : f,
        ),
      };
    }
    case "REMOVE_FILE": {
      return { ...state, files: state.files.filter((f) => f.id !== action.fileId) };
    }
    case "TOGGLE_SHEET": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.fileId
            ? {
                ...f,
                sheets: f.sheets.map((s) =>
                  s.sheetName === action.sheetName ? { ...s, selected: !s.selected } : s,
                ),
              }
            : f,
        ),
      };
    }
    case "SET_HEADER_ROW": {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.fileId
            ? {
                ...f,
                sheets: f.sheets.map((s) =>
                  s.sheetName === action.sheetName ? { ...s, headerRowIndex: action.rowIndex } : s,
                ),
              }
            : f,
        ),
      };
    }
    case "SET_SCHEMA": {
      return { ...state, schema: action.schema };
    }
    case "UPSERT_TARGET_COLUMN": {
      const exists = state.schema.targetColumns.some((c) => c.id === action.column.id);
      const targetColumns = exists
        ? state.schema.targetColumns.map((c) => (c.id === action.column.id ? action.column : c))
        : [...state.schema.targetColumns, action.column];
      return { ...state, schema: { ...state.schema, targetColumns } };
    }
    case "REMOVE_TARGET_COLUMN": {
      return {
        ...state,
        schema: {
          ...state.schema,
          targetColumns: state.schema.targetColumns.filter((c) => c.id !== action.id),
          mappings: state.schema.mappings.map((m) =>
            m.targetColumnId === action.id ? { ...m, targetColumnId: null } : m,
          ),
        },
        cleaningOptions: {
          ...state.cleaningOptions,
          duplicateKeyColumnIds: state.cleaningOptions.duplicateKeyColumnIds.filter(
            (id) => id !== action.id,
          ),
        },
      };
    }
    case "SET_MAPPING": {
      const others = state.schema.mappings.filter(
        (m) =>
          !(
            m.fileId === action.fileId &&
            m.sheetName === action.sheetName &&
            m.originalColumn === action.originalColumn
          ),
      );
      return {
        ...state,
        schema: {
          ...state.schema,
          mappings: [
            ...others,
            {
              fileId: action.fileId,
              sheetName: action.sheetName,
              originalColumn: action.originalColumn,
              targetColumnId: action.targetColumnId,
            },
          ],
        },
      };
    }
    case "SET_CLEANING_OPTIONS": {
      return { ...state, cleaningOptions: { ...state.cleaningOptions, ...action.patch } };
    }
    case "SET_PROCESS_RESULT": {
      return { ...state, processResult: action.result };
    }
    case "SET_PIVOT_CONFIG": {
      return { ...state, pivotConfig: { ...state.pivotConfig, ...action.patch } };
    }
    case "GO_TO_STEP": {
      return { ...state, step: action.step };
    }
    case "RESET_FILES_AND_SCHEMA": {
      return {
        ...initialState,
      };
    }
    default:
      return state;
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  return { state, dispatch };
}
