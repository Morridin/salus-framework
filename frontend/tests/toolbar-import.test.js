const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("toolbar opens the picker and sends selected files, allowing the same file again", () => {
    const elements = new Map();
    const messages = [];
    function element(id) {
        if (!elements.has(id)) {
            elements.set(id, {
                dataset: {},
                value: "12",
                listeners: {},
                clicks: 0,
                attributes: {},
                setAttribute(name, value) { this.attributes[name] = value; },
                addEventListener(name, callback) { this.listeners[name] = callback; },
                click() { this.clicks += 1; },
            });
        }
        return elements.get(id);
    }
    const tool = element("rectangle");
    tool.dataset.tool = "rectangle";
    const source = fs.readFileSync(path.join(__dirname, "../plugins/5e61/main.js"), "utf8");
    vm.runInNewContext(source, {
        document: {
            querySelectorAll: () => [tool],
            querySelector: () => element("toolbar"),
            getElementById: element,
        },
        BroadcastChannel: class {
            postMessage(message) { messages.push(message); }
            addEventListener() {}
        },
    });

    assert.equal(messages.at(-1).payload.tool, "none");
    assert.equal(tool.attributes["aria-pressed"], "false");
    tool.listeners.click();
    assert.equal(messages.at(-1).payload.tool, "rectangle");
    assert.equal(tool.attributes["aria-pressed"], "true");
    tool.listeners.click();
    assert.equal(messages.at(-1).payload.tool, "none");
    assert.equal(tool.attributes["aria-pressed"], "false");
    assert.equal(element("toolbar").dataset.tool, "none");

    const input = element("import-geojson-file");
    element("import-geojson").listeners.click();
    assert.equal(input.clicks, 1);

    const file = new Blob(['{"type":"FeatureCollection","features":[]}']);
    for (let index = 0; index < 2; index += 1) {
        input.files = [file];
        input.value = "segmentations.geojson";
        input.listeners.change();
        assert.equal(input.value, "");
        assert.equal(messages.at(-1).payload.file, file);
        assert.equal(messages.at(-1).payload.type, "segmentation-import-request");
        assert.equal(messages.at(-1).sourcePluginId, "5e61");
        assert.equal(messages.at(-1).targetPluginId, "a11e");
    }

    const count = messages.length;
    input.files = [];
    input.listeners.change();
    assert.equal(messages.length, count);
});
