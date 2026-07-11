/**
 * command-text — quote-aware helpers for scanning raw shell command strings for
 * delivery/mutation verbs without false-positiving on prose that lives INSIDE a
 * quoted argument value (e.g. `--message "ship the release"`).
 * @owner palantirkc-plugin-hooks
 *
 * G-CLS-D (pm authorization-flexibility): `protectedMutationClassForPromptGate`
 * and `isProvenNonOntologyDelivery` (hooks/gates/prompt-dtc-enforcement-gate.impl.ts)
 * regex-scan the FULL lowercased Bash command string for delivery verbs
 * (`git push`, `release`, `deploy`, `npm publish`, `bun publish`, `gh pr create|merge|…`)
 * with no positional/argv anchoring — so a verb sitting inside a QUOTED, purely
 * descriptive argument (e.g. a `decisions:emit --decision "ship the release"` call)
 * was misclassified as a real delivery action even though the executable performs
 * none. `stripQuotedSegments` blanks the CONTENTS of quoted substrings so those
 * verb regexes stop matching prose.
 */

/**
 * Interpreter "execute a quoted script" idioms where the quoted string IS the
 * executed command, not descriptive prose — `bash -c "git push origin main"` must
 * still classify as a real delivery command. When the command matches this,
 * `stripQuotedSegments` leaves ALL quotes in the command untouched (conservative:
 * never strips when an inner-script exec pattern is present anywhere in the
 * command), so the verb scan still sees the inner script.
 */
const INTERPRETER_EXEC_FLAG_RE =
  /\b(?:bash|sh|zsh|dash|ksh)\s+-c\b|\bbun\s+-e\b|\bnode\s+-e\b|\bpython[0-9.]*\s+-c\b/;

/**
 * Blank out the CONTENTS of quoted substrings (both `"..."` and `'...'`, with
 * backslash-escaped-quote awareness) so verb-regex scans over the returned string
 * do not match prose living inside a quoted argument value. Quote delimiters and
 * all non-quoted text are preserved byte-for-byte so callers that also need the
 * original structure (lengths, positions) still line up.
 *
 * EXCEPTION: if `command` contains an interpreter "execute a quoted script" idiom
 * (see {@link INTERPRETER_EXEC_FLAG_RE}) the command is returned UNCHANGED — the
 * quoted string there is the executed script, not inert prose, and stripping it
 * would let a real delivery command hidden inside `-c "..."` silently bypass the
 * delivery floor (false negative, strictly worse than the false positive this
 * helper fixes).
 *
 * Callers pass the already-lowercased command string (matching the existing
 * call-site convention in prompt-dtc-enforcement-gate.impl.ts).
 */
export function stripQuotedSegments(command: string): string {
  if (INTERPRETER_EXEC_FLAG_RE.test(command)) return command;

  let result = "";
  let quoteChar: '"' | "'" | undefined;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i] as string;
    if (quoteChar) {
      if (ch === "\\" && i + 1 < command.length) {
        // Escaped char inside the quote: blank both chars, skip ahead.
        result += "  ";
        i++;
        continue;
      }
      if (ch === quoteChar) {
        quoteChar = undefined;
        result += ch;
        continue;
      }
      result += " ";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quoteChar = ch;
      result += ch;
      continue;
    }
    result += ch;
  }
  return result;
}
