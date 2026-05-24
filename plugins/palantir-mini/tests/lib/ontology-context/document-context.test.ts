import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { retrieveDocumentContext } from "../../../lib/ontology-context/document-context";

describe("retrieveDocumentContext", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-doc-context-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function seedCorpus(
    docs: Array<{ id: string; text: string }>,
    opts: { mode?: "full-document" | "chunk-mode"; topK?: number } = {},
  ): void {
    const dotDir = path.join(tmpDir, ".palantir-mini");
    fs.mkdirSync(dotDir, { recursive: true });
    for (const doc of docs) {
      fs.writeFileSync(path.join(tmpDir, `${doc.id}.md`), doc.text);
    }
    const corpus = {
      schemaVersion: "palantir-mini/document-corpus/v1",
      documents: docs.map((d) => ({ documentId: d.id, sourcePath: `${d.id}.md` })),
      retrievalMode: opts.mode ?? "chunk-mode",
      topK: opts.topK ?? 2,
    };
    fs.writeFileSync(
      path.join(dotDir, "document-corpus.json"),
      JSON.stringify(corpus, null, 2),
    );
  }

  test("returns empty when no corpus file present", () => {
    const result = retrieveDocumentContext({ projectRoot: tmpDir });
    expect(result.corpusFound).toBe(false);
    expect(result.contextChunks.length).toBe(0);
  });

  test("full-document mode returns one chunk per document", () => {
    seedCorpus(
      [
        { id: "doc-a", text: "# Doc A\nSome content about apples." },
        { id: "doc-b", text: "# Doc B\nSome content about bananas." },
      ],
      { mode: "full-document" },
    );
    const result = retrieveDocumentContext({
      projectRoot: tmpDir,
      retrievalModeOverride: "full-document",
    });
    expect(result.corpusFound).toBe(true);
    expect(result.retrievalKind).toBe("full-document");
    expect(result.contextChunks.length).toBe(2);
    // Each chunk score should be 1 in full-document mode
    expect(result.contextChunks.every((c) => c.score === 1)).toBe(true);
  });

  test("chunk-mode scoring picks top-K with token overlap", () => {
    seedCorpus(
      [
        {
          id: "doc-a",
          text: "## Apples\nApples are red.\n\n## Bananas\nBananas are yellow.",
        },
        {
          id: "doc-b",
          text: "## Cars\nCars have wheels.\n\n## Trains\nTrains run on rails.",
        },
      ],
      { mode: "chunk-mode", topK: 2 },
    );
    const result = retrieveDocumentContext({
      projectRoot: tmpDir,
      promptTokens: ["apples", "bananas"],
      topKOverride: 2,
    });
    expect(result.corpusFound).toBe(true);
    expect(result.retrievalKind).toBe("chunk-mode");
    expect(result.contextChunks.length).toBeLessThanOrEqual(2);
    // At least one chunk must score > 0 (the apples or bananas chunk from doc-a)
    expect(result.contextChunks.some((c) => c.score > 0)).toBe(true);
    // All returned chunks should come from doc-a (matching prompt tokens)
    expect(result.contextChunks.every((c) => c.documentId === "doc-a")).toBe(true);
  });

  test("topKOverride respects override", () => {
    seedCorpus(
      [{ id: "doc-a", text: "## H1\nfoo\n## H2\nbar\n## H3\nbaz" }],
      { mode: "chunk-mode", topK: 5 },
    );
    const result = retrieveDocumentContext({
      projectRoot: tmpDir,
      promptTokens: ["foo"],
      topKOverride: 1,
    });
    expect(result.contextChunks.length).toBe(1);
  });
});
