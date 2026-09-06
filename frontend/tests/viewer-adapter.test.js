const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");

const surfaceModule = import(pathToFileURL(
    path.join(
        __dirname,
        "../plugins/a11e/js/viewer-adapter.js",
    ),
));

test("viewer adapter translates image operations for tools", async () => {
    const overlays = [];
    const updates = [];
    const removed = [];
    const viewer = {
        addOverlay(overlay) {
            overlays.push(overlay);
        },
        updateOverlay(element, location) {
            updates.push({element, location});
        },
        removeOverlay(element) {
            removed.push(element);
        },
        viewport: {
            pointFromPixel({x, y}) {
                return {x: x + 1, y: y + 2};
            },
            viewportToImageCoordinates({x, y}) {
                return {x: x * 10, y: y * 10};
            },
            imageToViewportRectangle(x, y, width, height) {
                return {x: x / 10, y: y / 10, width, height};
            },
        },
        world: {
            getItemAt() {
                return {getContentSize: () => ({x: 1000, y: 800})};
            },
        },
    };
    const document = {
        createElement(tagName) {
            return {tagName};
        },
        createElementNS(namespace, tagName) {
            const element = {
                namespace,
                tagName,
                classes: [],
                attributes: new Map(),
                setAttribute(name, value) {
                    this.attributes.set(name, String(value));
                },
            };
            element.classList = {
                add: (...names) => element.classes.push(...names),
            };
            return element;
        },
    };

    const {createViewerAdapter} = await surfaceModule;
    const surface = createViewerAdapter({viewer, document});
    const element = surface.createElement("div");

    assert.deepEqual(surface.toImagePoint({x: 2, y: 3}), {x: 30, y: 50});

    surface.addOverlay(element, {x: 10, y: 20, width: 30, height: 40});
    surface.updateOverlay(element, {x: 20, y: 30, width: 40, height: 50});
    surface.removeOverlay(element);

    assert.deepEqual(overlays[0], {
        element,
        location: {x: 1, y: 2, width: 30, height: 40},
    });
    assert.deepEqual(updates[0], {
        element,
        location: {x: 2, y: 3, width: 40, height: 50},
    });
    assert.deepEqual(removed, [element]);

    const layer = surface.createSvgLayer("brush-layer");
    assert.equal(layer.tagName, "svg");
    assert.deepEqual(layer.classes, ["brush-layer"]);
    assert.equal(layer.attributes.get("viewBox"), "0 0 1000 800");
    assert.equal(layer.attributes.get("aria-hidden"), "true");
    assert.deepEqual(overlays[1].location, {
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
    });
});
