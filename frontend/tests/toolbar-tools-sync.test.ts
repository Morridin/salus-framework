import { required } from "./helpers/assertions.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const registryModule = import("../plugins/a11e/src/tools/core/registry.js");

// The toolbar plugin keeps its own hardcoded buttons, so this test pins them
// to the registry: adding/removing a tool must update both places together.
// (A runtime import across plugin folders would couple the deployment layout,
// hence this sync check instead.)
void test("5e61 toolbar buttons stay in sync with the tool registry", async () => {
    const { TOOL_IDS } = await registryModule;
    const html = fs.readFileSync(path.join(process.cwd(), "plugins/5e61/index.html"), "utf8");
    const buttonTools = [...html.matchAll(/data-tool="([^"]+)"/g)].map((match) => required(match[1])).sort();
    const registeredTools = [...TOOL_IDS].sort();

    assert.deepEqual(buttonTools, registeredTools);
});
