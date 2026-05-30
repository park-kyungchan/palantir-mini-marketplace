#!/usr/bin/env sh
# palantir-mini — scripts/bootstrap-home.sh (sprint-061 A.W7)
#
# Verifies that a home environment has all required palantir-mini plugin
# artifacts present.  Run on a fresh machine or after a plugin update to
# confirm the environment is ready before starting a session.
#
# Checks performed:
#   1. Plugin manifest      (.codex-plugin/plugin.json)
#   2. Hooks registry       (hooks/hooks.json)
#   3. MCP server source    (bridge/mcp-server.ts)
#   4. Overlay rules CORE   (runtime-overlay/rules/CORE.md)
#   5. Research-core index  (runtime-overlay/research-core/MANIFEST.json)
#   6. Schemas snapshot     (runtime-overlay/schemas-snapshot/MANIFEST.json)
#   7. Per-project memory   (~/.claude/projects/-home-palantirkc/memory/ — optional stub)
#
# Exit codes:
#   0  All required checks passed (optional check may have created a stub).
#   1  One or more required files are missing.
#
# Authority: sprint-061 A.W7; plan ~/.claude/plans/inherited-discovering-quill.md §4.A.W7.
# Cross-ref: lib/runtime-overlay/resolve-rule.ts, build-context-capsule.ts.

set -eu

# ── Resolve plugin root ───────────────────────────────────────────────────────
# Prefer PALANTIR_MINI_PLUGIN_ROOT env; fall back to the directory containing
# this script's parent.
if [ -n "${PALANTIR_MINI_PLUGIN_ROOT:-}" ]; then
  PLUGIN_ROOT="${PALANTIR_MINI_PLUGIN_ROOT}"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi

HOME_DIR="${HOME:-/home/palantirkc}"
PASS=0
FAIL=0
STUB_CREATED=0

# ── Helpers ───────────────────────────────────────────────────────────────────

check_required() {
  label="$1"
  filepath="$2"
  if [ -e "${filepath}" ]; then
    printf "  PASS  %s\n        %s\n" "${label}" "${filepath}"
    PASS=$((PASS + 1))
  else
    printf "  FAIL  %s\n        MISSING: %s\n" "${label}" "${filepath}"
    FAIL=$((FAIL + 1))
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────────

printf "\npalantir-mini bootstrap-home check\n"
printf "plugin root: %s\n" "${PLUGIN_ROOT}"
printf "home dir:    %s\n\n" "${HOME_DIR}"

# ── Check 1: Plugin manifest ──────────────────────────────────────────────────
check_required \
  "Plugin manifest (.codex-plugin/plugin.json)" \
  "${PLUGIN_ROOT}/.codex-plugin/plugin.json"

# ── Check 2: Hooks registry ───────────────────────────────────────────────────
check_required \
  "Hooks registry (hooks/hooks.json)" \
  "${PLUGIN_ROOT}/hooks/hooks.json"

# ── Check 3: MCP server source ────────────────────────────────────────────────
check_required \
  "MCP server source (bridge/mcp-server.ts)" \
  "${PLUGIN_ROOT}/bridge/mcp-server.ts"

# ── Check 4: Runtime-overlay rules CORE.md ────────────────────────────────────
check_required \
  "Overlay rules CORE (runtime-overlay/rules/CORE.md)" \
  "${PLUGIN_ROOT}/runtime-overlay/rules/CORE.md"

# ── Check 5: Research-core MANIFEST.json ──────────────────────────────────────
check_required \
  "Research-core index (runtime-overlay/research-core/MANIFEST.json)" \
  "${PLUGIN_ROOT}/runtime-overlay/research-core/MANIFEST.json"

# ── Check 6: Schemas-snapshot MANIFEST.json ───────────────────────────────────
check_required \
  "Schemas snapshot (runtime-overlay/schemas-snapshot/MANIFEST.json)" \
  "${PLUGIN_ROOT}/runtime-overlay/schemas-snapshot/MANIFEST.json"

# ── Check 7 (optional): Per-project memory directory ─────────────────────────
MEMORY_DIR="${HOME_DIR}/.claude/projects/-home-palantirkc/memory"
if [ -d "${MEMORY_DIR}" ]; then
  printf "  PASS  Per-project memory dir exists (optional)\n"
  printf "        %s\n" "${MEMORY_DIR}"
else
  printf "  INFO  Per-project memory dir absent — creating stub (optional)\n"
  printf "        %s\n" "${MEMORY_DIR}"
  if mkdir -p "${MEMORY_DIR}" 2>/dev/null; then
    STUB_CREATED=1
    printf "  PASS  Stub created: %s\n" "${MEMORY_DIR}"
  else
    printf "  WARN  Could not create stub (check permissions): %s\n" "${MEMORY_DIR}"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
printf "\n"
if [ "${STUB_CREATED}" -eq 1 ]; then
  printf "Stub created: per-project memory dir initialised at %s\n" "${MEMORY_DIR}"
fi

printf "Results: %d passed, %d failed\n" "${PASS}" "${FAIL}"

if [ "${FAIL}" -gt 0 ]; then
  printf "\nbootstrap-home FAILED: %d required file(s) missing.\n" "${FAIL}"
  printf "Run the plugin installer or check PLUGIN_ROOT path.\n\n"
  exit 1
fi

printf "\nbootstrap-home OK: environment ready for palantir-mini session.\n\n"
exit 0
