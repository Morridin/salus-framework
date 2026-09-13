import { loadViewer } from "./helpers/viewer.js";
import { fakeSurface } from "./helpers/rendering.js";
import { createAnnotationRenderer } from "../plugins/a11e/src/annotations/renderer.js";
import assert from "node:assert/strict";
import test from "node:test";

const controllerModule = import("../plugins/a11e/src/tools/core/tool-controller.js");

void test("tool selection validates settings, clamps tolerance, and returns detached snapshots", async () => {
    const { createToolController } = await controllerModule;
    const env = loadViewer();
    const viewerElement = env.viewerElement;
    const surface = fakeSurface();
    const controller = createToolController({
        env: { document: env.document, OpenSeadragon: env.OpenSeadragon },
        session: { viewer: env.app.viewer, viewerElement, isImageReady: () => true, reportStatus() {} },
        surface,
        renderer: createAnnotationRenderer({ surface }),
        sampler: { ready: false, error: null, select: () => [], setImage() {}, dispose() {} },
        annotations: { commitAnnotation: (annotation) => ({ ...annotation, id: "test" }) },
    });

    assert.deepEqual(controller.selectTool(), {
        tool: "none",
        brushRadius: 12,
        brushTolerance: 24,
    });

    const selected = controller.selectTool({ tool: "brush", brushTolerance: 300 });

    assert.equal(selected.brushTolerance, 255);

    selected.brushTolerance = 5;

    for (const brushTolerance of [-1, NaN, Infinity]) {
        assert.equal(controller.selectTool({ brushTolerance }).brushTolerance, 255);
    }

    assert.equal(controller.selectTool({ brushTolerance: 0 }).brushTolerance, 0);
    assert.deepEqual(controller.selectTool(), {
        tool: "brush",
        brushRadius: 12,
        brushTolerance: 0,
    });
    assert.equal(viewerElement.dataset.tool, "brush");
});
