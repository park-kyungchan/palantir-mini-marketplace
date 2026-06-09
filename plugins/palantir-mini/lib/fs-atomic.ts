import * as fs from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";

/**
 * Atomic JSON write (sync): write to `<file>.<pid>.<ts>.tmp` then rename into place.
 * Shared single audited write path (audit G7.6.1). Body verbatim from the prior
 * per-module `atomicWriteJson` sync copies (fs.mkdirSync + tmp + writeFileSync + renameSync).
 */
export function atomicWriteJsonSync(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

/**
 * Atomic JSON write (async): write to `<file>.<pid>.<ts>.tmp` then rename into place.
 * Body verbatim from lib/prompt-front-door/store.ts (fs/promises mkdir/writeFile/rename).
 */
export async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, filePath);
}
