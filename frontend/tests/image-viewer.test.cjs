const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");

const viewerModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/main.js"),
));

class FakeElement {
    constructor() {
        this.attributes = new Map();
        this.children = [];
        this.dataset = {};
        this.hidden = false;
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => this.classNames.add(name)),
            remove: (...names) => names.forEach(name => this.classNames.delete(name)),
        };
    }

    append(child) {
        this.children.push(child);
        child.parent = this;
    }

    remove() {
        if (!this.parent) return;
        this.parent.children = this.parent.children.filter(child => child !== this);
        this.parent = null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }
}

async function loadViewer() {
    const handlers = new Map();
    const keyHandlers = [];
    const sentMessages = [];
    let messageHandler = null;
    const viewerElement = new FakeElement();
    const errorElement = new FakeElement();

    const viewer = {
        addHandler(name, handler) {
            const existingHandler = handlers.get(name);
            handlers.set(name, event => {
                existingHandler?.(event);
                handler(event);
            });
        },
        addOverlay({element}) {
            element.parent = viewerElement;
        },
        removeOverlay() {},
        updateOverlay() {},
        viewport: {
            pointFromPixel(position) {
                return position;
            },
            viewportToImageCoordinates(point) {
                return point;
            },
            imageToViewportRectangle(x, y, width, height) {
                return {x, y, width, height};
            },
        },
        world: {
            getItemAt() {
                return {
                    getContentSize() {
                        return {x: 1000, y: 800};
                    },
                };
            },
        },
    };

    const document = {
        getElementById(id) {
            return id === "image-viewer" ? viewerElement : errorElement;
        },
        createElement() {
            return new FakeElement();
        },
        createElementNS() {
            return new FakeElement();
        },
        addEventListener(name, handler) {
            if (name === "keydown") keyHandlers.push(handler);
        },
    };
    const window = {
        location: {search: ""},
    };
    const channel = {
        addEventListener(type, handler) {
            if (type === "message") {
                messageHandler = handler;
            }
        },
        removeEventListener() {},
        postMessage(message) {
            sentMessages.push(message);
        },
    };

    function OpenSeadragon() {
        return viewer;
    }
    OpenSeadragon.MouseTracker = class {
        constructor(options) {
            this.options = options;
        }

        setTracking() {
            return this;
        }
    };

    const {startImageViewer} = await viewerModule;
    const app = startImageViewer({
        document,
        OpenSeadragon,
        window,
        channel,
    });

    return {
        handlers,
        keyHandlers,
        messageHandler: message => messageHandler({
            data: {
                targetPluginId: "a11e",
                ...message,
            },
        }),
        app,
        sentMessages,
        viewerElement,
        window,
    };
}

test("polygon tool creates an image-coordinate annotation", async () => {
    const environment = await loadViewer();
    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "polygon"},
    });

    const click = environment.handlers.get("canvas-click");
    click({position: {x: 10, y: 20}, quick: true});
    click({position: {x: 80, y: 25}, quick: true});
    click({position: {x: 45, y: 90}, quick: true});
    environment.keyHandlers[0]({key: "Enter", preventDefault() {}});

    assert.equal(environment.app.annotations.length, 1);
    assert.deepEqual(
        environment.app.annotations[0],
        {
            id: "segmentation-1",
            shape: "polygon",
            points: [
                {x: 10, y: 20},
                {x: 80, y: 25},
                {x: 45, y: 90},
            ],
        },
    );
    assert.deepEqual(
        JSON.parse(JSON.stringify(environment.sentMessages.at(-1))),
        {
            sourcePluginId: "a11e",
            targetPluginId: "5e61",
            payload: {
                type: "segmentation-created",
                annotation: {
                    id: "segmentation-1",
                    shape: "polygon",
                    points: [
                        {x: 10, y: 20},
                        {x: 80, y: 25},
                        {x: 45, y: 90},
                    ],
                },
            },
        },
    );
});

test("an unfinished polygon is discarded when the tool changes", async () => {
    const environment = await loadViewer();
    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "polygon"},
    });
    environment.handlers.get("canvas-click")({
        position: {x: 10, y: 20},
        quick: true,
    });

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "circle"},
    });

    assert.equal(environment.app.annotations.length, 0);
    assert.equal(environment.viewerElement.dataset.tool, "circle");
});

test("rectangle tool creates one annotation through the shared store", async () => {
    const environment = await loadViewer();

    environment.handlers.get("canvas-press")({
        position: {x: 80, y: 90},
    });
    environment.handlers.get("canvas-release")({
        position: {x: 10, y: 20},
    });

    assert.deepEqual(
        environment.app.annotations,
        [{
            id: "segmentation-1",
            shape: "rectangle",
            x: 10,
            y: 20,
            width: 70,
            height: 70,
        }],
    );
    assert.equal(
        environment.sentMessages.filter(
            message => message.payload.type === "segmentation-created",
        ).length,
        1,
    );
});

test("brush tool creates one image-coordinate annotation with its radius", async () => {
    const environment = await loadViewer();
    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {
            type: "segmentation-tool-changed",
            tool: "brush",
            brushRadius: 18,
        },
    });

    environment.handlers.get("canvas-press")({
        position: {x: 10, y: 20},
        originalEvent: {button: 0},
    });
    environment.handlers.get("canvas-drag")({
        position: {x: 30, y: 40},
    });
    environment.handlers.get("canvas-release")({
        position: {x: 50, y: 60},
    });

    assert.deepEqual(environment.app.annotations, [{
        id: "segmentation-1",
        shape: "brush",
        radius: 18,
        points: [
            {x: 10, y: 20},
            {x: 30, y: 40},
            {x: 50, y: 60},
        ],
    }]);
    assert.equal(
        environment.sentMessages.filter(
            message => message.payload.type === "segmentation-created",
        ).length,
        1,
    );
});

test("brush ignores a non-primary mouse button", async () => {
    const environment = await loadViewer();
    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {
            type: "segmentation-tool-changed",
            tool: "brush",
            brushRadius: 12,
        },
    });

    environment.handlers.get("canvas-press")({
        position: {x: 10, y: 20},
        originalEvent: {button: 2},
    });
    environment.handlers.get("canvas-release")({
        position: {x: 30, y: 40},
        originalEvent: {button: 2},
    });

    assert.equal(environment.app.annotations.length, 0);
});

test("an unfinished brush stroke is discarded when the tool changes", async () => {
    const environment = await loadViewer();
    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {
            type: "segmentation-tool-changed",
            tool: "brush",
            brushRadius: 12,
        },
    });
    environment.handlers.get("canvas-press")({
        position: {x: 10, y: 20},
        originalEvent: {button: 0},
    });

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "circle"},
    });
    environment.handlers.get("canvas-release")({
        position: {x: 30, y: 40},
    });

    assert.equal(environment.app.annotations.length, 0);
    assert.equal(environment.viewerElement.dataset.tool, "circle");
});
