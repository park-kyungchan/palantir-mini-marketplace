#!/usr/bin/env bun
import path from "node:path";
import { runGeminiHookAdapterCli } from "../plugin/lib/gemini/native-hook-adapter";

const extensionRoot = path.resolve(import.meta.dir, "..");
const pluginRoot = path.join(extensionRoot, "plugin");

process.stdout.write(await runGeminiHookAdapterCli(process.argv, undefined, {
  pluginRoot,
  hooksJsonPath: path.join(pluginRoot, "hooks", "hooks.json"),
}));
