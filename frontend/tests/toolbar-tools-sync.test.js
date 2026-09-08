const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");

const registryModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/tools/core/registry.js"),
));

// The toolbar plugin keeps its own hardcoded buttons, so this test pins them
// to the registry: adding/removing a tool must update both places together.
// (A runtime import across plugin folders would couple the deployment layout,
// hence this sync check instead.)
test("5e61 toolbar buttons stay in sync with the tool registry", async () => {
    const {TOOL_DEFS} = await registryModule;
    const html = fs.readFileSync(
        path.join(__dirname, "../plugins/5e61/index.html"),
        "utf8",
    );
    const buttonTools = [...html.matchAll(/data-tool="([^"]+)"/g)]
        .map(match => match[1])
        .sort();
    const registeredTools = TOOL_DEFS.map(def => def.id).sort();
    assert.deepEqual(buttonTools, registeredTools);
});
