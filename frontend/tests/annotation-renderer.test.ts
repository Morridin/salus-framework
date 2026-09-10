import { FakeElement, fakeSurface } from "./helpers/rendering.js";
import { required } from "./helpers/assertions.js";
import type { Bounds } from "../plugins/a11e/src/shared/types.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createAnnotationRenderer } from "../plugins/a11e/src/annotations/renderer.js";

void test("renders every annotation shape through one renderer", () => {
    const overlays: { element: FakeElement; bounds: Bounds }[] = [];
    const layers: FakeElement[] = [];
    const surface = fakeSurface({
        createElement: (tagName) => new FakeElement(tagName),
        createSvgElement: (tagName) => new FakeElement(tagName),
        createSvgLayer(className) {
            const layer = new FakeElement("svg");

            layer.className = className;
            layers.push(layer);

            return layer;
        },
        addOverlay(element, bounds) {
            overlays.push({ element, bounds });
        },
    });
    const renderer = createAnnotationRenderer<FakeElement>({ surface });

    renderer.initializeLayers();

    const rectangle = renderer.render({
        id: "segmentation-1",
        shape: "rectangle" as const,
        x: 10,
        y: 20,
        width: 30,
        height: 40,
    });
    const circle = renderer.render({
        id: "segmentation-2",
        shape: "circle" as const,
        centerX: 50,
        centerY: 60,
        radius: 10,
    });
    const polygon = renderer.render({
        id: "segmentation-3",
        shape: "polygon" as const,
        points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
        ],
    });
    const brush = renderer.render({
        id: "segmentation-4",
        shape: "brush" as const,
        radius: 5,
        points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
        ],
    });
    const assistedBrush = renderer.render({
        id: "segmentation-5",
        shape: "assisted-brush" as const,
        runs: [{ y: 2, xStart: 3, xEnd: 4 }],
    });

    assert.deepEqual([...rectangle.classes], ["segmentation-overlay", "rectangle"]);
    assert.deepEqual(required(overlays[0]).bounds, {
        x: 10,
        y: 20,
        width: 30,
        height: 40,
    });
    assert.deepEqual([...circle.classes], ["segmentation-overlay", "circle"]);
    assert.deepEqual(required(overlays[1]).bounds, {
        x: 40,
        y: 50,
        width: 20,
        height: 20,
    });
    assert.equal(polygon.attributes.get("points"), "1,2 3,4");
    assert.equal(brush.attributes.get("d"), "M 1 2 L 3 4");
    assert.equal(brush.attributes.get("stroke-width"), "10");
    assert.equal(assistedBrush.attributes.get("d"), "M 3 2 H 5 V 3 H 3 Z");
    assert.deepEqual(
        layers.map((layer) => layer.children.length),
        [1, 1, 1],
    );
});

void test("finalizes and removes overlay previews", () => {
    const updates: { element: FakeElement; bounds: Bounds }[] = [];
    const removals: FakeElement[] = [];
    const surface = fakeSurface({
        createElement: (tagName) => new FakeElement(tagName),
        createSvgElement: (tagName) => new FakeElement(tagName),
        createSvgLayer: () => new FakeElement("svg"),
        addOverlay() {},
        updateOverlay(element, bounds) {
            updates.push({ element, bounds });
        },
        removeOverlay(element) {
            removals.push(element);
        },
    });
    const renderer = createAnnotationRenderer<FakeElement>({ surface });

    renderer.initializeLayers();

    const element = renderer.render(
        {
            shape: "rectangle" as const,
            x: 1,
            y: 2,
            width: 3,
            height: 4,
        },
        { preview: true },
    );

    renderer.finalizePreview(element, {
        id: "segmentation-1",
        shape: "rectangle" as const,
        x: 5,
        y: 6,
        width: 7,
        height: 8,
    });
    renderer.remove(element);

    assert.equal(element.classes.has("preview"), false);
    assert.equal(element.dataset.annotationId, "segmentation-1");
    assert.deepEqual(required(updates[0]).bounds, { x: 5, y: 6, width: 7, height: 8 });
    assert.deepEqual(removals, [element]);
});

void test("reports unsupported shapes and uninitialized layers clearly", () => {
    const surface = fakeSurface({
        createElement: (tagName) => new FakeElement(tagName),
        createSvgElement: (tagName) => new FakeElement(tagName),
    });
    const renderer = createAnnotationRenderer<FakeElement>({ surface });

    assert.equal(renderer.canRender("rectangle"), true);
    assert.equal(renderer.canRender("polygon"), false);
    assert.throws(() => renderer.render({ shape: "polygon" as const, points: [] }), /layers are not initialized/);
    assert.throws(() => {
        void Reflect.apply(renderer.render, renderer, [{ shape: "triangle" as const }]);
    }, /Unsupported annotation shape: triangle/);
});
