import { FakeElement, fakeSurface } from "./helpers/rendering.js";
import type { Point } from "../plugins/a11e/src/shared/types.js";
import { createDom } from "./helpers/dom.js";
import assert from "node:assert/strict";
import test from "node:test";

const brushModule = import("../plugins/a11e/src/tools/assisted-brush/tool.js");
const rendererModule = import("../plugins/a11e/src/annotations/renderer.js");
const controllerModule = import("../plugins/a11e/src/annotations/controller.js");

void test("assisted brush creates a compact intensity-mask annotation", async () => {
    const { createAssistedBrushTool } = await brushModule;
    const { createAnnotationRenderer } = await rendererModule;
    const { createAnnotationController } = await controllerModule;
    const sampledPoints = [];
    const surface = fakeSurface({
        toImagePoint: (point) => point,
        createSvgLayer: () => new FakeElement(),
        createSvgElement: () => new FakeElement(),
    });
    const renderer = createAnnotationRenderer<FakeElement>({ surface });

    renderer.initializeLayers();

    const controller = createAnnotationController<FakeElement>({
        env: createDom(),
        session: { isImageReady: () => true, reportStatus() {} },
        renderer,
        toolbar: { publishAnnotation() {} },
    });
    const sampler = {
        ready: true,
        error: null,
        select(point: Point) {
            sampledPoints.push(point);

            return [
                { x: Math.round(point.x), y: 2 },
                { x: Math.round(point.x) + 1, y: 2 },
                { x: Math.round(point.x), y: 3 },
                { x: Math.round(point.x) + 1, y: 3 },
            ];
        },
    };
    const tool = createAssistedBrushTool<FakeElement>({
        surface,
        renderer,
        sampler,
        brushSettings: { brushRadius: 4, brushTolerance: 18 },
        commitAnnotation: controller.commitAnnotation,
    });

    tool.press({ position: { x: 1, y: 2 }, originalEvent: { button: 0 } });
    tool.release({ position: { x: 9, y: 2 } });

    assert.ok(sampledPoints.length > 2, "long movements should be interpolated");
    assert.deepEqual(controller.annotations, [
        {
            id: "segmentation-1",
            shape: "assisted-brush" as const,
            radius: 4,
            tolerance: 18,
            runs: [
                { y: 2, xStart: 1, xEnd: 10 },
                { y: 3, xStart: 1, xEnd: 10 },
            ],
        },
    ]);
});
