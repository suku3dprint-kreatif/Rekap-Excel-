// Wrapper sisi client untuk memanggil parseWorker dari komponen React.

import type { ParsedSheet } from "../types";
import type { ParseWorkerRequest, ParseWorkerRequestFile, ParseWorkerResponse } from "./parseWorker";

export interface ParseFileTask {
  id: string;
  file: File;
}

export interface ParseProgressEvent {
  fileId: string;
  fileName: string;
  status: "done" | "error";
  sheets?: ParsedSheet[];
  error?: string;
}

/**
 * Baca banyak file sekaligus lewat Web Worker. onProgress dipanggil setiap satu file
 * selesai diproses (baik sukses maupun gagal), Promise selesai setelah semua file diproses.
 */
export function parseFilesInWorker(
  tasks: ParseFileTask[],
  onProgress: (ev: ParseProgressEvent) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./parseWorker.ts", import.meta.url));

    worker.onmessage = (ev: MessageEvent<ParseWorkerResponse>) => {
      const msg = ev.data;
      if (msg.type === "progress") {
        onProgress({
          fileId: msg.fileId,
          fileName: msg.fileName,
          status: msg.status,
          sheets: msg.status === "done" ? msg.sheets : undefined,
          error: msg.status === "error" ? msg.error : undefined,
        });
      } else if (msg.type === "complete") {
        worker.terminate();
        resolve();
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    Promise.all(
      tasks.map(
        async (t): Promise<ParseWorkerRequestFile> => ({
          id: t.id,
          name: t.file.name,
          buffer: await t.file.arrayBuffer(),
        }),
      ),
    ).then((files) => {
      const req: ParseWorkerRequest = { type: "parse", files };
      const transferables = files.map((f) => f.buffer);
      worker.postMessage(req, transferables);
    });
  });
}
