const assert = require("node:assert/strict");
const test = require("node:test");

const controllerModule = import("../plugins/a11e/js/tools/core/tool-controller.js");

test("tool selection validates settings, clamps tolerance, and returns detached snapshots", async () => {
    const {createToolController} = await controllerModule;
    const viewerElement = {dataset: {}};
    const controller = createToolController({
        document: {addEventListener() {}},
        OpenSeadragon: {MouseTracker: class { setTracking() {} }},
        session: {viewer: {addHandler() {}}, viewerElement},
    });
    assert.deepEqual(controller.selectTool(), {
        tool: "none", brushRadius: 12, brushTolerance: 24,
    });
    const selected = controller.selectTool({tool: "brush", brushTolerance: 300});
    assert.equal(selected.brushTolerance, 255);
    selected.brushTolerance = 5;
    for (const brushTolerance of [null, "10", -1, NaN, Infinity]) {
        assert.equal(controller.selectTool({brushTolerance}).brushTolerance, 255);
    }
    assert.equal(controller.selectTool({brushTolerance: 0}).brushTolerance, 0);
    assert.deepEqual(controller.selectTool({tool: "unknown", brushRadius: 90}), {
        tool: "brush", brushRadius: 12, brushTolerance: 0,
    });
    assert.equal(viewerElement.dataset.tool, "brush");
});
