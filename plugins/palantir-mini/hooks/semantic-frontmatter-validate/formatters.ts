// palantir-mini v3.7.0 — hooks/semantic-frontmatter-validate/formatters.ts
// Pure-fn frontmatter form detectors (JSDoc + YAML-in-comment).
// Extracted from semantic-frontmatter-validate.ts during A.1 decomposition.

/**
 * Check Form A: JSDoc block at file start containing @owner + @purpose.
 */
export function checkJsDocForm(content: string): { found: boolean; missingFields: string[] } {
  const jsdocMatch = content.match(/^\/\*\*[\s\S]*?\*\//);
  if (!jsdocMatch) return { found: false, missingFields: [] };
  const block = jsdocMatch[0]!;
  const missing: string[] = [];
  if (!/@owner\s+\S/.test(block))   missing.push("@owner");
  if (!/@purpose\s+\S/.test(block)) missing.push("@purpose");
  return { found: true, missingFields: missing };
}

/**
 * Check Form B: // @semantic-frontmatter comment block at file start
 * with owner: and purpose: keys in the following comment lines.
 */
export function checkYamlCommentForm(content: string): { found: boolean; missingFields: string[] } {
  const lines = content.split("\n");
  const markerIdx = lines.findIndex(l => /^\/\/\s*@semantic-frontmatter/.test(l));
  if (markerIdx === -1) return { found: false, missingFields: [] };

  // Gather the comment block immediately following the marker
  const commentLines: string[] = [];
  for (let i = markerIdx + 1; i < lines.length && i < markerIdx + 20; i++) {
    const line = lines[i]!;
    if (!line.startsWith("//")) break;
    commentLines.push(line.replace(/^\/\/\s*/, ""));
  }
  const block = commentLines.join("\n");
  const missing: string[] = [];
  if (!/^owner\s*:/m.test(block))   missing.push("owner:");
  if (!/^purpose\s*:/m.test(block)) missing.push("purpose:");
  return { found: true, missingFields: missing };
}
