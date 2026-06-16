# mcp-tool-fingerprint.golden.json — regeneration

`mcp-tool-fingerprint.golden.json` is the checked-in `{ toolName -> inputSchemaFingerprint }`
baseline for pm's McpTool self-ontology surface (HO-2). The structural drift guard in
`executor-registration.test.ts` recomputes fingerprints from the LIVE `bridge/mcp-server.ts`
`TOOLS` array and asserts `compareToolSurface(live, golden).drift === false`.

When you INTENTIONALLY change a tool's `inputSchema` (or add/remove a tool), the guard
will fail with `structural-drift` / `added` / `removed`. After confirming the change is
intended, regenerate this baseline (run from the plugin dir
`plugins/palantir-mini/`) and review the diff in PR:

```sh
bun -e 'import("./bridge/mcp-server.ts").then(async m=>{const{fingerprintSurface}=await import("./lib/self-ontology-fingerprint/index.ts");const f=fingerprintSurface(m.TOOLS);const o={};for(const k of Object.keys(f).sort())o[k]=f[k];await Bun.write("tests/ontology/self/mcp-tool-fingerprint.golden.json",JSON.stringify(o,null,2)+"\n");})'
```

OUTPUT shape is intentionally OUT of fingerprint scope (the fingerprint hashes only
`{name, inputSchema}`). An OUTPUT-only change — e.g. pm 7.13.0 adding `runtimeIdentity`
to `pm_plugin_self_check`'s result — does NOT change any fingerprint and MUST stay a
non-drift `match`. Do not add output shape to the fingerprint.
