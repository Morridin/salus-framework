import { loadViewer } from "./helpers/viewer.js";
import type { Viewer } from "../plugins/a11e/src/viewer/types.js";
import type { Bounds } from "../plugins/a11e/src/shared/types.js";
import { required } from "./helpers/assertions.js";
import assert from "node:assert/strict";
import test from "node:test";

const surfaceModule = import("../plugins/a11e/src/viewer/viewer-adapter.js");

void test("viewer adapter translates image operations for tools", async () => {
    const overlays: { element: HTMLElement | SVGElement; location: Bounds }[] = [];
    const updates: { element: HTMLElement | SVGElement; location: Bounds }[] = [];
    const removed: (HTMLElement | SVGElement)[] = [];
    const env = loadViewer();
    const viewer: Viewer = {
        ...env.app.viewer,
        addOverlay(overlay) {
            overlays.push(overlay);
        },
        updateOverlay(element, location) {
            updates.push({ element, location });
        },
        removeOverlay(element) {
            removed.push(element);
        },
        viewport: {
            pointFromPixel({ x, y }) {
                return { x: x + 1, y: y + 2 };
            },
            viewportToImageCoordinates({ x, y }) {
                return { x: x * 10, y: y * 10 };
            },
            imageToViewportRectangle(x, y, width, height) {
                return { x: x / 10, y: y / 10, width, height };
            },
        },
        world: {
            getItemAt() {
                return { getContentSize: () => ({ x: 1000, y: 800 }) };
            },
        },
    };
    const { document, OpenSeadragon } = env;

    const { createViewerAdapter } = await surfaceModule;
    const surface = createViewerAdapter({ env: { document, OpenSeadragon }, session: { viewer } });
    const element = surface.createElement("div");

    assert.deepEqual(surface.toImagePoint({ x: 2, y: 3 }), { x: 30, y: 50 });

    surface.addOverlay(element, { x: 10, y: 20, width: 30, height: 40 });
    surface.updateOverlay(element, { x: 20, y: 30, width: 40, height: 50 });
    surface.removeOverlay(element);

    assert.deepEqual(required(overlays[0]), {
        element,
        location: { x: 1, y: 2, width: 30, height: 40 },
    });
    assert.deepEqual(required(updates[0]), {
        element,
        location: { x: 2, y: 3, width: 40, height: 50 },
    });
    assert.deepEqual(removed, [element]);

    const layer = surface.createSvgLayer("brush-layer");

    assert.equal(layer.tagName, "svg");
    assert.deepEqual(Array.from(layer.classList), ["brush-layer"]);
    assert.equal(layer.getAttribute("viewBox"), "0 0 1000 800");
    assert.equal(layer.getAttribute("aria-hidden"), "true");
    assert.deepEqual(required(overlays[1]).location, {
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
    });
});
