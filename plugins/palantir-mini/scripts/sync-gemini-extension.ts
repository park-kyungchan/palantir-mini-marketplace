#!/usr/bin/env bun

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const pluginRoot = process.env.PALANTIR_MINI_ROOT ?? path.resolve(import.meta.dir, "..");
const extensionRoot = path.join(pluginRoot, ".gemini-extension");
const sourceSkillsRoot = path.join(pluginRoot, "skills");
const sourceAgentsRoot = path.join(pluginRoot, "agents");
const extensionSkillsRoot = path.join(extensionRoot, "skills");
const extensionAgentsRoot = path.join(extensionRoot, "agents");
const extensionAgentDocsRoot = path.join(extensionRoot, "agent-docs");
const extensionPluginRoot = path.join(extensionRoot, "plugin");

const runtimeDirectories = [
  "agents",
  "bridge",
  "convex",
  "docs",
  "hooks",
  "lib",
  "managed-settings.d",
  "monitors",
  "runtime-overlay",
  "scripts",
  "skills",
];

const runtimeFiles = [
  ".mcp.json",
  ".ssot-authority.json",
  "CHANGELOG.md",
  "README.md",
  "SSOT-AUTHORITY.md",
  "bun.lock",
  "package.json",
  "tsconfig.json",
];

function safeRuntimeCopyFilter(source: string): boolean {
  const relative = path.relative(pluginRoot, source);
  if (relative.startsWith("..")) return true;
  const parts = relative.split(path.sep).filter(Boolean);
  if (parts.some((part) => [".git", ".gemini-extension", ".palantir-mini", "node_modules", "portable"].includes(part))) {
    return false;
  }
  const basename = path.basename(source);
  if (basename === ".env" || basename.startsWith(".env.")) return false;
  return true;
}

async function mirrorSkills(): Promise<number> {
  await rm(extensionSkillsRoot, { recursive: true, force: true });
  await mkdir(extensionSkillsRoot, { recursive: true });
  await cp(sourceSkillsRoot, extensionSkillsRoot, {
    recursive: true,
    filter: (source) => !source.split(path.sep).includes(".palantir-mini"),
  });
  const entries = await readdir(extensionSkillsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_")).length;
}

async function mirrorAgentDocs(): Promise<number> {
  await rm(extensionAgentsRoot, { recursive: true, force: true });
  await rm(extensionAgentDocsRoot, { recursive: true, force: true });
  await mkdir(extensionAgentDocsRoot, { recursive: true });
  const entries = await readdir(sourceAgentsRoot, { withFileTypes: true });
  let copied = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    await cp(path.join(sourceAgentsRoot, entry.name), path.join(extensionAgentDocsRoot, entry.name));
    copied += 1;
  }
  return copied;
}

async function mirrorRuntimePayload(): Promise<{ directoryCount: number; fileCount: number }> {
  await rm(extensionPluginRoot, { recursive: true, force: true });
  await mkdir(extensionPluginRoot, { recursive: true });

  let directoryCount = 0;
  for (const directory of runtimeDirectories) {
    const source = path.join(pluginRoot, directory);
    if (!existsSync(source)) continue;
    await cp(source, path.join(extensionPluginRoot, directory), {
      recursive: true,
      filter: safeRuntimeCopyFilter,
    });
    directoryCount += 1;
  }

  let fileCount = 0;
  for (const file of runtimeFiles) {
    const source = path.join(pluginRoot, file);
    if (!existsSync(source) || !safeRuntimeCopyFilter(source)) continue;
    await cp(source, path.join(extensionPluginRoot, file));
    fileCount += 1;
  }

  return { directoryCount, fileCount };
}

if (!existsSync(extensionRoot)) {
  throw new Error(`Gemini extension root not found: ${extensionRoot}`);
}

const skillCount = await mirrorSkills();
const agentDocCount = await mirrorAgentDocs();
const runtimePayload = await mirrorRuntimePayload();
console.log(
  `synced Gemini extension mirror: ${skillCount} skills, ${agentDocCount} agent docs, ` +
    `${runtimePayload.directoryCount} runtime dirs, ${runtimePayload.fileCount} runtime files`,
);
