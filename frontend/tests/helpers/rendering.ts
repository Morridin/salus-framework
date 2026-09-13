import { JSDOM } from "jsdom";
import type { ViewerSurface } from "../../plugins/a11e/src/annotations/renderer.js";

/** Real DOM elements with stubs for the OpenSeadragon operations. */
export function fakeSurface(overrides: Partial<ViewerSurface> = {}): ViewerSurface {
    const document = new JSDOM("<!doctype html>").window.document;

    return {
        toImagePoint: (point) => point,
        createElement: (tag) => document.createElement(tag),
        createSvgElement: (tag) => document.createElementNS("http://www.w3.org/2000/svg", tag),
        createSvgLayer(className) {
            const layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");

            layer.classList.add(className);

            return layer;
        },
        addOverlay() {},
        updateOverlay() {},
        removeOverlay() {},
        ...overrides,
    };
}
