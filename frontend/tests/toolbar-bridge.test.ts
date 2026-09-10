import assert from "node:assert/strict";
import test from "node:test";
import { createToolbarBridge } from "../plugins/a11e/src/messaging/toolbar-bridge.js";
import type { ToolSelection } from "../plugins/a11e/src/tools/core/types.js";
import { required } from "./helpers/assertions.js";

void test("toolbar boundary ignores malformed messages and file lookalikes", () => {
    let listener: ((event: MessageEvent<unknown>) => void) | undefined;
    let removed: ((event: MessageEvent<unknown>) => void) | undefined;
    const selections: ToolSelection[] = [];
    const toolbar = createToolbarBridge({
        channel: {
            postMessage() {},
            addEventListener(_type, handler) {
                listener = handler;
            },
            removeEventListener(_type, handler) {
                removed = handler;
            },
        },
    });
    const unsubscribe = toolbar.subscribe({
        onToolChanged(selection) {
            selections.push(selection);
        },
        onImportRequested() {
            return Promise.reject(new Error("A file lookalike must not be imported"));
        },
    });

    for (const data of [
        null,
        12,
        [],
        {},
        { sourcePluginId: "5e61", targetPluginId: "a11e", payload: null },
        { sourcePluginId: "5e61", targetPluginId: "a11e", payload: { type: "segmentation-tool-changed", tool: {} } },
        {
            sourcePluginId: "5e61",
            targetPluginId: "a11e",
            payload: { type: "segmentation-import-request", file: { text: "invalid" } },
        },
        {
            sourcePluginId: "5e61",
            targetPluginId: "a11e",
            payload: { type: "segmentation-import-request", file: { text: () => Promise.resolve("{}") } },
        },
    ]) {
        required(listener)(new MessageEvent<unknown>("message", { data }));
    }

    assert.deepEqual(selections, []);

    required(listener)(
        new MessageEvent<unknown>("message", {
            data: {
                sourcePluginId: "5e61",
                targetPluginId: "a11e",
                payload: { type: "segmentation-tool-changed", tool: "brush", brushRadius: 8 },
            },
        }),
    );

    assert.deepEqual(selections, [{ tool: "brush", brushRadius: 8 }]);

    for (const value of [null, "10", {}, NaN, Infinity]) {
        required(listener)(
            new MessageEvent<unknown>("message", {
                data: {
                    sourcePluginId: "5e61",
                    targetPluginId: "a11e",
                    payload: {
                        type: "segmentation-tool-changed",
                        tool: "brush",
                        brushRadius: value,
                        brushTolerance: value,
                    },
                },
            }),
        );
        assert.deepEqual(selections.at(-1), { tool: "brush" });
    }

    required(listener)(
        new MessageEvent<unknown>("message", {
            data: {
                sourcePluginId: "5e61",
                targetPluginId: "a11e",
                payload: { type: "segmentation-tool-changed", tool: "none", brushRadius: 6, brushTolerance: 0 },
            },
        }),
    );
    assert.deepEqual(selections.at(-1), { tool: "none", brushRadius: 6, brushTolerance: 0 });

    unsubscribe();

    assert.equal(removed, listener);
});
