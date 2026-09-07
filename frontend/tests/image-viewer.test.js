const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");

const viewerModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/main.js"),
));
const exportModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/annotations/geojson-export.js"),
));

async function importFile(environment, file, sourcePluginId = "5e61") {
    environment.messageHandler({
        sourcePluginId,
        payload: {type: "segmentation-import-request", file},
    });
    await new Promise(resolve => setImmediate(resolve));
}

class FakeElement {
    constructor() {
        this.attributes = new Map();
        this.style = new Map();
        this.style.setProperty = this.style.set.bind(this.style);
        this.listeners = new Map();
        this.children = [];
        this.dataset = {};
        this.hidden = false;
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => this.classNames.add(name)),
            remove: (...names) => names.forEach(name => this.classNames.delete(name)),
        };
    }

    append(...children) {
        this.children.push(...children);
        children.forEach(child => { child.parent = this; });
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    focus() {}

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
    const downloads = [];
    const revokedUrls = [];
    let exportedFile = null;
    let messageHandler = null;
    const viewerElement = new FakeElement();
    const errorElement = new FakeElement();
    const statusElement = new FakeElement();
    const overlays = [];

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
            overlays.push(element);
        },
        removeOverlay(element) {
            const index = overlays.indexOf(element);
            if (index !== -1) overlays.splice(index, 1);
            element.remove();
        },
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

    const panelElements = new Map([
        "annotation-panel", "toggle-annotations", "collapse-annotations",
        "annotation-list", "annotation-count", "annotation-empty",
        "annotation-name", "annotation-color", "annotation-color-value",
        "delete-annotation",
    ].map(id => [id, new FakeElement()]));
    const document = {
        getElementById(id) {
            if (panelElements.has(id)) return panelElements.get(id);
            if (id === "viewer-status") return statusElement;
            return id === "image-viewer" ? viewerElement : errorElement;
        },
        createElement(tagName) {
            const element = new FakeElement();
            if (tagName === "a") {
                element.click = () => downloads.push({
                    filename: element.download,
                    url: element.href,
                });
            }
            return element;
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
        Blob,
        URL: {
            createObjectURL(file) {
                exportedFile = file;
                return "blob:segmentation-export";
            },
            revokeObjectURL(url) {
                revokedUrls.push(url);
            },
        },
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
        panelElements,
        keyHandlers,
        messageHandler: message => messageHandler({
            data: {
                targetPluginId: "a11e",
                ...message,
            },
        }),
        app,
        downloads,
        getExportedFile: () => exportedFile,
        revokedUrls,
        sentMessages,
        viewerElement,
        statusElement,
        overlays,
        window,
    };
}

test("Salus import appends, renders, publishes, and re-exports all five shapes with fresh IDs", async () => {
    const environment = await loadViewer();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });
    environment.handlers.get("open")();
    environment.handlers.get("canvas-press")({position: {x: 1, y: 2}});
    environment.handlers.get("canvas-release")({position: {x: 30, y: 40}});
    const annotations = [
        {id: "segmentation-1", shape: "rectangle", x: 10, y: 20, width: 30, height: 40},
        {id: "segmentation-2", shape: "circle", centerX: 80, centerY: 60, radius: 15},
        {id: "segmentation-3", shape: "polygon", points: [{x: 5, y: 5}, {x: 25, y: 8}, {x: 12, y: 30}]},
        {id: "segmentation-4", shape: "brush", radius: 6, points: [{x: 10, y: 10}]},
        {id: "segmentation-5", shape: "assisted-brush", radius: 8, tolerance: 24, runs: [{y: 10, xStart: 5, xEnd: 8}]},
    ];
    const {annotationsToGeoJson} = await exportModule;
    const file = new Blob([JSON.stringify(annotationsToGeoJson(annotations))]);
    await importFile(environment, file);

    const expected = annotations.map((annotation, index) => ({
        ...annotation, id: `segmentation-${index + 2}`,
    }));
    assert.deepEqual(environment.app.annotations.slice(1), expected);
    const rendered = environment.overlays.flatMap(element => [element, ...element.children]);
    for (const annotation of expected) {
        assert.ok(rendered.some(element => element.dataset.annotationId === annotation.id));
    }
    assert.deepEqual(environment.sentMessages.slice(-5).map(message => message.payload.annotation), expected);
    assert.equal(environment.statusElement.textContent, "Imported 5 annotations.");
    assert.equal(environment.statusElement.hidden, false);

    environment.messageHandler({sourcePluginId: "5e61", payload: {type: "segmentation-export-request"}});
    const exported = JSON.parse(await environment.getExportedFile().text());
    assert.deepEqual(exported.features.map(feature => feature.properties.salus.annotation), environment.app.annotations);

    await importFile(environment, file);
    environment.handlers.get("canvas-press")({position: {x: 5, y: 6}});
    environment.handlers.get("canvas-release")({position: {x: 70, y: 80}});
    assert.equal(environment.app.annotations.length, 12);
    assert.equal(new Set(environment.app.annotations.map(annotation => annotation.id)).size, 12);
});

test("invalid imports leave existing annotations and drawings untouched", async () => {
    const environment = await loadViewer();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });
    environment.handlers.get("open")();
    environment.handlers.get("canvas-press")({position: {x: 1, y: 2}});
    environment.handlers.get("canvas-release")({position: {x: 30, y: 40}});
    const before = structuredClone(environment.app.annotations);
    const overlayCount = environment.overlays.length;
    const {annotationsToGeoJson} = await exportModule;
    const mixed = annotationsToGeoJson([before[0], before[0]]);
    delete mixed.features[1].properties.salus;

    for (const file of [
        new Blob(["not json"]),
        new Blob([JSON.stringify(mixed)]),
        {text: async () => { throw new Error("File could not be read"); }},
    ]) {
        await importFile(environment, file);
        assert.match(environment.statusElement.textContent, /Could not import annotations:/);
        assert.deepEqual(environment.app.annotations, before);
        assert.equal(environment.overlays.length, overlayCount);
    }
});

test("import waits for image readiness and ignores messages from other plugins", async () => {
    const environment = await loadViewer();
    const file = new Blob(['{"type":"FeatureCollection","features":[]}']);
    await importFile(environment, file);
    assert.match(environment.statusElement.textContent, /Wait for the image to load/);
    environment.handlers.get("open")();
    await importFile(environment, file);
    assert.equal(environment.statusElement.textContent, "Imported 0 annotations.");
    await importFile(environment, new Blob(["invalid"]), "another-plugin");
    assert.equal(environment.statusElement.textContent, "Imported 0 annotations.");
});

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

test("delete button removes every shape from the viewer, list, and export", async () => {
    const environment = await loadViewer();
    const element = id => environment.panelElements.get(id);
    const deleteButton = element("delete-annotation");
    assert.equal(deleteButton.disabled, true);
    environment.handlers.get("open")();
    const annotations = [
        {id: "r", shape: "rectangle", x: 10, y: 20, width: 30, height: 40},
        {id: "c", shape: "circle", centerX: 80, centerY: 60, radius: 15},
        {id: "p", shape: "polygon", points: [{x: 5, y: 5}, {x: 25, y: 8}, {x: 12, y: 30}]},
        {id: "b", shape: "brush", radius: 6, points: [{x: 10, y: 10}]},
        {id: "a", shape: "assisted-brush", radius: 8, tolerance: 24, runs: [{y: 10, xStart: 5, xEnd: 8}]},
    ];
    const {annotationsToGeoJson} = await exportModule;
    await importFile(environment, new Blob([JSON.stringify(annotationsToGeoJson(annotations))]));
    const rendered = () => environment.overlays.flatMap(item => [item, ...item.children]);

    // Delete an explicitly selected last row first, then the automatic selections.
    element("annotation-list").children.at(-1).listeners.get("click")();
    for (let remaining = 4; remaining >= 0; remaining--) {
        const selected = rendered().find(item => item.classNames.has("selected"));
        assert.ok(selected);
        assert.equal(deleteButton.disabled, false);
        deleteButton.listeners.get("click")();
        assert.equal(environment.app.annotations.length, remaining);
        assert.equal(environment.app.annotations.some(item => item.id === selected.dataset.annotationId), false);
        assert.equal(rendered().includes(selected), false);
        assert.equal(element("annotation-list").children.length, remaining);
        assert.equal(element("annotation-count").textContent, String(remaining));
        assert.equal(deleteButton.disabled, remaining === 0);
        assert.equal(rendered().filter(item => item.classNames.has("selected")).length, remaining ? 1 : 0);
        environment.messageHandler({sourcePluginId: "5e61", payload: {type: "segmentation-export-request"}});
        const exported = JSON.parse(await environment.getExportedFile().text());
        assert.deepEqual(exported.features.map(feature => feature.properties.salus.annotation.id), environment.app.annotations.map(item => item.id));
    }
    assert.equal(element("annotation-empty").hidden, false);
    assert.equal(element("annotation-name").disabled, true);
    assert.equal(element("annotation-color").disabled, true);
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
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });

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

test("export request downloads rectangle annotations as GeoJSON", async () => {
    const environment = await loadViewer();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });

    environment.handlers.get("canvas-press")({
        position: {x: 80, y: 90},
    });
    environment.handlers.get("canvas-release")({
        position: {x: 10, y: 20},
    });
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-export-request"},
    });

    assert.deepEqual(environment.downloads, [{
        filename: "segmentations.geojson",
        url: "blob:segmentation-export",
    }]);
    assert.deepEqual(environment.revokedUrls, [
        "blob:segmentation-export",
    ]);

    const exportedFile = environment.getExportedFile();
    assert.equal(exportedFile.type, "application/geo+json");
    assert.deepEqual(JSON.parse(await exportedFile.text()), {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [10, 20],
                    [80, 20],
                    [80, 90],
                    [10, 90],
                    [10, 20],
                ]],
            },
            properties: {
                objectType: "annotation",
                name: "segmentation-1",
                sourceTool: "rectangle",
                salus: {
                    version: 1,
                    annotation: {
                        id: "segmentation-1",
                        shape: "rectangle",
                        x: 10,
                        y: 20,
                        width: 70,
                        height: 70,
                    },
                },
            },
        }],
    });
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

test("an unfinished drag shape is discarded when the tool changes", async () => {
    const environment = await loadViewer();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });
    let removedOverlay = null;
    environment.app.viewer.removeOverlay = element => {
        removedOverlay = element;
    };

    environment.handlers.get("canvas-press")({
        position: {x: 10, y: 20},
    });
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "polygon"},
    });
    environment.handlers.get("canvas-release")({
        position: {x: 80, y: 90},
    });

    assert.ok(removedOverlay);
    assert.equal(environment.app.annotations.length, 0);
    assert.equal(environment.viewerElement.dataset.tool, "polygon");
});

test("annotation panel tracks drawings and imports, and edits survive export and import", async () => {
    const environment = await loadViewer();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });
    const element = id => environment.panelElements.get(id);
    assert.equal(element("annotation-count").textContent, "0");
    assert.equal(element("annotation-empty").hidden, false);
    assert.equal(element("annotation-name").disabled, true);
    environment.handlers.get("open")();
    environment.handlers.get("canvas-press")({position: {x: 1, y: 2}});
    assert.equal(element("annotation-count").textContent, "0");
    environment.handlers.get("canvas-release")({position: {x: 30, y: 40}});
    assert.equal(element("annotation-count").textContent, "1");
    assert.equal(element("annotation-empty").hidden, true);
    assert.equal(element("annotation-name").value, "segmentation-1");
    assert.equal(element("annotation-color").value, "#2ecc71");

    element("annotation-name").value = "Healthy tissue";
    element("annotation-name").listeners.get("input")();
    element("annotation-color").value = "#ed8175";
    element("annotation-color").listeners.get("input")();
    assert.equal(environment.app.annotations[0].name, "Healthy tissue");
    assert.equal(environment.app.annotations[0].color, "#ed8175");
    const drawing = environment.overlays.find(item => item.dataset.annotationId === "segmentation-1");
    assert.equal(drawing.classNames.has("selected"), true);
    assert.equal(drawing.style.get("--annotation-color"), "#ed8175");
    assert.equal(element("annotation-list").children[0].children[1].children[0].textContent, "Healthy tissue");

    environment.messageHandler({sourcePluginId: "5e61", payload: {type: "segmentation-export-request"}});
    const exported = environment.getExportedFile();
    assert.equal(JSON.parse(await exported.text()).features[0].properties.name, "Healthy tissue");
    await importFile(environment, exported);
    assert.equal(element("annotation-count").textContent, "2");
    const importedDrawing = environment.overlays.find(item => item.dataset.annotationId === "segmentation-2");
    assert.equal(importedDrawing.classNames.has("selected"), false);
    const importedRow = element("annotation-list").children[1];
    importedRow.listeners.get("click")();
    assert.equal(drawing.classNames.has("selected"), false);
    assert.equal(importedDrawing.classNames.has("selected"), true);
    assert.equal(importedRow.attributes.get("aria-pressed"), "true");
    assert.equal(element("annotation-name").value, "Healthy tissue");
    assert.equal(element("annotation-color").value, "#ed8175");
    element("annotation-name").value = "Imported region";
    element("annotation-name").listeners.get("input")();
    assert.equal(environment.app.annotations[0].name, "Healthy tissue");
    assert.equal(environment.app.annotations[1].name, "Imported region");
    assert.equal(importedDrawing.classNames.has("selected"), true);
    element("annotation-list").children[0].listeners.get("click")();
    assert.equal(drawing.classNames.has("selected"), true);
    assert.equal(importedDrawing.classNames.has("selected"), false);
});

test("viewer stays idle until a tool is selected and cancels drawing on deselection", async () => {
    const environment = await loadViewer();
    function gesture() {
        for (const name of ["canvas-press", "canvas-drag", "canvas-release", "canvas-click"]) {
            const event = {position: {x: 80, y: 90}, quick: true};
            environment.handlers.get(name)(event);
            assert.equal(event.preventDefaultAction, undefined);
        }
        assert.equal(environment.app.annotations.length, 0);
    }
    assert.equal(environment.viewerElement.dataset.tool, "none");
    gesture();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });
    environment.handlers.get("canvas-press")({position: {x: 10, y: 20}});
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "none"},
    });
    assert.equal(environment.viewerElement.dataset.tool, "none");
    gesture();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {type: "segmentation-tool-changed", tool: "rectangle"},
    });
    environment.handlers.get("canvas-release")({position: {x: 80, y: 90}});
    assert.equal(environment.app.annotations.length, 0);
});
