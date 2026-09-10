import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createDom } from "./helpers/dom.js";
import { required } from "./helpers/assertions.js";
import { isRecord } from "../plugins/a11e/src/shared/validation.js";

void test("toolbar opens the picker and sends selected files, allowing the same file again", () => {
    const env = createDom("5e61");
    const { document } = env;
    const messages: unknown[] = [];

    function latest() {
        const message = required(messages.at(-1));

        assert.ok(isRecord(message) && isRecord(message.payload));

        return {
            sourcePluginId: message.sourcePluginId,
            targetPluginId: message.targetPluginId,
            payload: message.payload,
        };
    }

    const tool = required(document.querySelector<HTMLButtonElement>('[data-tool="rectangle"]'));
    const input = required(document.querySelector<HTMLInputElement>("#import-geojson-file"));
    let clicks = 0;

    input.click = () => {
        clicks += 1;
    };

    const source = fs.readFileSync(path.join(process.cwd(), "plugins/5e61/dist/main.js"), "utf8");

    vm.runInNewContext(source, {
        document,
        BroadcastChannel: class {
            postMessage(message: unknown) {
                messages.push(message);
            }

            addEventListener() {}
        },
    });

    assert.equal(latest().payload.tool, "none");
    assert.equal(tool.getAttribute("aria-pressed"), "false");

    tool.click();

    assert.equal(latest().payload.tool, "rectangle");
    assert.equal(tool.getAttribute("aria-pressed"), "true");

    tool.click();

    assert.equal(latest().payload.tool, "none");
    assert.equal(tool.getAttribute("aria-pressed"), "false");
    assert.equal(document.querySelector(".toolbar")?.getAttribute("data-tool"), "none");

    env.fire(required(document.getElementById("import-geojson")), "click");

    assert.equal(clicks, 1);

    const file = new Blob(['{"type":"FeatureCollection","features":[]}']);

    for (let index = 0; index < 2; index += 1) {
        env.setFiles(input, [file]);
        env.fire(input, "change");

        assert.equal(input.value, "");
        assert.equal(latest().payload.file, file);
        assert.equal(latest().payload.type, "segmentation-import-request");
        assert.equal(latest().sourcePluginId, "5e61");
        assert.equal(latest().targetPluginId, "a11e");
    }

    const count = messages.length;

    env.setFiles(input, []);
    env.fire(input, "change");

    assert.equal(messages.length, count);
});
