const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");

const brushModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/tools/assisted-brush/tool.js"),
));
const rendererModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/annotations/renderer.js"),
));
const controllerModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/annotations/controller.js"),
));

class FakeElement {
    constructor() {
        this.attributes = new Map();
        this.style = new Map();
        this.style.setProperty = this.style.set.bind(this.style);
        this.dataset = {};
        this.classes = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => this.classes.add(name)),
            remove: (...names) => names.forEach(name => this.classes.delete(name)),
        };
    }

    append(child) {
        child.parent = this;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    remove() {
        this.removed = true;
    }
}

test("assisted brush creates a compact intensity-mask annotation", async () => {
    const {createAssistedBrushTool} = await brushModule;
    const {createAnnotationRenderer} = await rendererModule;
    const {createAnnotationController} = await controllerModule;
    const sampledPoints = [];
    const surface = {
        toImagePoint: point => point,
        createSvgLayer: () => new FakeElement(),
        createSvgElement: () => new FakeElement(),
    };
    const renderer = createAnnotationRenderer({surface});
    renderer.initializeLayers();
    const controller = createAnnotationController({
        renderer,
        publishAnnotation() {},
    });
    const sampler = {
        ready: true,
        select(point) {
            sampledPoints.push(point);
            return [
                {x: Math.round(point.x), y: 2},
                {x: Math.round(point.x) + 1, y: 2},
                {x: Math.round(point.x), y: 3},
                {x: Math.round(point.x) + 1, y: 3},
            ];
        },
    };
    const tool = createAssistedBrushTool({
        surface,
        renderer,
        sampler,
        brushSettings: {brushRadius: 4, brushTolerance: 18},
        commitAnnotation: controller.commitAnnotation,
    });

    tool.press({position: {x: 1, y: 2}, originalEvent: {button: 0}});
    tool.release({position: {x: 9, y: 2}});

    assert.ok(sampledPoints.length > 2, "long movements should be interpolated");
    assert.deepEqual(controller.annotations, [{
        id: "segmentation-1",
        shape: "assisted-brush",
        radius: 4,
        tolerance: 18,
        runs: [
            {y: 2, xStart: 1, xEnd: 10},
            {y: 3, xStart: 1, xEnd: 10},
        ],
    }]);
});
