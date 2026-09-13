import type { Annotation } from "../plugins/a11e/src/shared/types.js";
import assert from "node:assert/strict";
import test from "node:test";
import { loadViewer } from "./helpers/viewer.js";
import { required, shape, parseJson } from "./helpers/assertions.js";
import type { ViewerToolEvent } from "../plugins/a11e/src/viewer/types.js";
import { annotationsFromGeoJson } from "../plugins/a11e/src/annotations/io/geojson-import.js";

const exportModule = import("../plugins/a11e/src/annotations/io/geojson-export.js");

async function importFile(environment: ReturnType<typeof loadViewer>, file: unknown, sourcePluginId = "5e61") {
    environment.messageHandler({ sourcePluginId, payload: { type: "segmentation-import-request", file } });
    await new Promise<void>((resolve) => setImmediate(resolve));
}

void test("Salus import appends, renders, publishes, and re-exports all five shapes with fresh IDs", async () => {
    const environment = loadViewer();

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });
    environment.handlers.get("open")();
    environment.handlers.get("canvas-press")({ position: { x: 1, y: 2 } });
    environment.handlers.get("canvas-release")({ position: { x: 30, y: 40 } });

    const annotations: Annotation[] = [
        { id: "segmentation-1", shape: "rectangle" as const, x: 10, y: 20, width: 30, height: 40 },
        { id: "segmentation-2", shape: "circle" as const, centerX: 80, centerY: 60, radius: 15 },
        {
            id: "segmentation-3",
            shape: "polygon" as const,
            points: [
                { x: 5, y: 5 },
                { x: 25, y: 8 },
                { x: 12, y: 30 },
            ],
        },
        { id: "segmentation-4", shape: "brush" as const, radius: 6, points: [{ x: 10, y: 10 }] },
        {
            id: "segmentation-5",
            shape: "assisted-brush" as const,
            radius: 8,
            tolerance: 24,
            runs: [{ y: 10, xStart: 5, xEnd: 8 }],
        },
    ];
    const { annotationsToGeoJson } = await exportModule;
    const file = new Blob([JSON.stringify(annotationsToGeoJson(annotations))]);

    await importFile(environment, file);

    const expected = annotations.map((annotation, index) => ({
        ...annotation,
        id: `segmentation-${index + 2}`,
    }));

    assert.deepEqual(environment.app.annotations.slice(1), expected);

    const rendered = environment.overlays.flatMap((element) => [element, ...element.children]);

    for (const annotation of expected) {
        assert.ok(rendered.some((element) => element.getAttribute("data-annotation-id") === annotation.id));
    }

    assert.deepEqual(
        environment.sentMessages.slice(-5).map((message) => message.payload.annotation),
        expected,
    );
    assert.equal(environment.statusElement.textContent, "Imported 5 annotations.");
    assert.equal(environment.statusElement.hidden, false);

    environment.messageHandler({ sourcePluginId: "5e61", payload: { type: "segmentation-export-request" } });

    assert.deepEqual(annotationsFromGeoJson(await environment.getExportedFile().text()), environment.app.annotations);

    await importFile(environment, file);
    environment.handlers.get("canvas-press")({ position: { x: 5, y: 6 } });
    environment.handlers.get("canvas-release")({ position: { x: 70, y: 80 } });

    assert.equal(environment.app.annotations.length, 12);
    assert.equal(new Set(environment.app.annotations.map((annotation) => annotation.id)).size, 12);
});

void test("invalid imports leave existing annotations and drawings untouched", async () => {
    const environment = loadViewer();

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });
    environment.handlers.get("open")();
    environment.handlers.get("canvas-press")({ position: { x: 1, y: 2 } });
    environment.handlers.get("canvas-release")({ position: { x: 30, y: 40 } });

    const before = structuredClone(environment.app.annotations);
    const overlayCount = environment.overlays.length;
    const { annotationsToGeoJson } = await exportModule;
    const mixed = annotationsToGeoJson([required(before[0]), required(before[0])]);

    Object.assign(required(mixed.features[1]), { properties: {} });

    for (const file of [
        new Blob(["not json"]),
        new Blob([JSON.stringify(mixed)]),
        new (class extends Blob {
            override text() {
                return Promise.reject(new Error("File could not be read"));
            }
        })(),
    ]) {
        await importFile(environment, file);

        assert.match(environment.statusElement.textContent, /Could not import annotations:/);
        assert.deepEqual(environment.app.annotations, before);
        assert.equal(environment.overlays.length, overlayCount);
    }
});

void test("import waits for image readiness and ignores messages from other plugins", async () => {
    const environment = loadViewer();
    const file = new Blob(['{"type":"FeatureCollection","features":[]}']);

    await importFile(environment, file);

    assert.match(environment.statusElement.textContent, /Wait for the image to load/);

    environment.handlers.get("open")();
    await importFile(environment, file);

    assert.equal(environment.statusElement.textContent, "Imported 0 annotations.");

    await importFile(environment, new Blob(["invalid"]), "another-plugin");

    assert.equal(environment.statusElement.textContent, "Imported 0 annotations.");
});

void test("polygon tool creates an image-coordinate annotation", () => {
    const environment = loadViewer();

    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "polygon" },
    });

    const click = environment.handlers.get("canvas-click");

    click({ position: { x: 10, y: 20 }, quick: true });
    click({ position: { x: 80, y: 25 }, quick: true });
    click({ position: { x: 45, y: 90 }, quick: true });
    environment.keyDown("Enter");

    assert.equal(environment.app.annotations.length, 1);
    assert.deepEqual(required(environment.app.annotations[0]), {
        id: "segmentation-1",
        shape: "polygon" as const,
        points: [
            { x: 10, y: 20 },
            { x: 80, y: 25 },
            { x: 45, y: 90 },
        ],
    });
    assert.deepEqual(parseJson(JSON.stringify(required(environment.sentMessages.at(-1)))), {
        sourcePluginId: "a11e",
        targetPluginId: "5e61",
        payload: {
            type: "segmentation-created",
            annotation: {
                id: "segmentation-1",
                shape: "polygon" as const,
                points: [
                    { x: 10, y: 20 },
                    { x: 80, y: 25 },
                    { x: 45, y: 90 },
                ],
            },
        },
    });
});

void test("delete button removes every shape from the viewer, list, and export", async () => {
    const environment = loadViewer();
    const element = (id: string) => environment.element(id);
    const deleteButton = environment.button("delete-annotation");

    assert.equal(deleteButton.disabled, true);

    environment.handlers.get("open")();

    const annotations: Annotation[] = [
        { id: "r", shape: "rectangle" as const, x: 10, y: 20, width: 30, height: 40 },
        { id: "c", shape: "circle" as const, centerX: 80, centerY: 60, radius: 15 },
        {
            id: "p",
            shape: "polygon" as const,
            points: [
                { x: 5, y: 5 },
                { x: 25, y: 8 },
                { x: 12, y: 30 },
            ],
        },
        { id: "b", shape: "brush" as const, radius: 6, points: [{ x: 10, y: 10 }] },
        { id: "a", shape: "assisted-brush" as const, radius: 8, tolerance: 24, runs: [{ y: 10, xStart: 5, xEnd: 8 }] },
    ];
    const { annotationsToGeoJson } = await exportModule;

    await importFile(environment, new Blob([JSON.stringify(annotationsToGeoJson(annotations))]));

    const rendered = () => environment.overlays.flatMap((item) => [item, ...Array.from(item.children)]);

    // Delete an explicitly selected last row first, then the automatic selections.
    environment.fire(required(element("annotation-list").lastElementChild), "click");

    for (let remaining = 4; remaining >= 0; remaining--) {
        const selected = required(rendered().find((item) => item.classList.contains("selected")));

        assert.ok(selected);
        assert.equal(deleteButton.disabled, false);

        environment.fire(deleteButton, "click");

        assert.equal(environment.app.annotations.length, remaining);
        assert.equal(
            environment.app.annotations.some((item) => item.id === selected.getAttribute("data-annotation-id")),
            false,
        );
        assert.equal(rendered().includes(selected), false);
        assert.equal(element("annotation-list").children.length, remaining);
        assert.equal(element("annotation-count").textContent, String(remaining));
        assert.equal(deleteButton.disabled, remaining === 0);
        assert.equal(rendered().filter((item) => item.classList.contains("selected")).length, remaining ? 1 : 0);

        environment.messageHandler({ sourcePluginId: "5e61", payload: { type: "segmentation-export-request" } });

        const exported = annotationsFromGeoJson(await environment.getExportedFile().text());

        assert.deepEqual(
            exported.map((annotation) => annotation.id),
            environment.app.annotations.map((item) => item.id),
        );
    }

    assert.equal(element("annotation-empty").hidden, false);
    assert.equal(environment.input("annotation-name").disabled, true);
    assert.equal(environment.input("annotation-color").disabled, true);
});

void test("an unfinished polygon is discarded when the tool changes", () => {
    const environment = loadViewer();

    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "polygon" },
    });
    environment.handlers.get("canvas-click")({
        position: { x: 10, y: 20 },
        quick: true,
    });

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "circle" },
    });

    assert.equal(environment.app.annotations.length, 0);
    assert.equal(environment.viewerElement.dataset.tool, "circle");
});

void test("rectangle tool creates one annotation through the shared store", () => {
    const environment = loadViewer();

    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });

    environment.handlers.get("canvas-press")({
        position: { x: 80, y: 90 },
    });
    environment.handlers.get("canvas-release")({
        position: { x: 10, y: 20 },
    });

    assert.deepEqual(environment.app.annotations, [
        {
            id: "segmentation-1",
            shape: "rectangle" as const,
            x: 10,
            y: 20,
            width: 70,
            height: 70,
        },
    ]);
    assert.equal(
        environment.sentMessages.filter((message) => message.payload.type === "segmentation-created").length,
        1,
    );
});

void test("export request downloads rectangle annotations as GeoJSON", async () => {
    const environment = loadViewer();

    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });

    environment.handlers.get("canvas-press")({
        position: { x: 80, y: 90 },
    });
    environment.handlers.get("canvas-release")({
        position: { x: 10, y: 20 },
    });
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-export-request" },
    });

    assert.deepEqual(environment.downloads, [
        {
            filename: "segmentations.geojson",
            url: "blob:segmentation-export",
        },
    ]);
    assert.deepEqual(environment.revokedUrls, ["blob:segmentation-export"]);

    const exportedFile = environment.getExportedFile();

    assert.equal(exportedFile.type, "application/geo+json");
    assert.deepEqual(parseJson(await exportedFile.text()), {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "Polygon",
                    coordinates: [
                        [
                            [10, 20],
                            [80, 20],
                            [80, 90],
                            [10, 90],
                            [10, 20],
                        ],
                    ],
                },
                properties: {
                    objectType: "annotation",
                    name: "segmentation-1",
                    sourceTool: "rectangle",
                    salus: {
                        version: 1,
                        annotation: {
                            id: "segmentation-1",
                            shape: "rectangle" as const,
                            x: 10,
                            y: 20,
                            width: 70,
                            height: 70,
                        },
                    },
                },
            },
        ],
    });
});

void test("brush tool creates one image-coordinate annotation with its radius", () => {
    const environment = loadViewer();

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
        position: { x: 10, y: 20 },
        originalEvent: { button: 0 },
    });
    environment.handlers.get("canvas-drag")({
        position: { x: 30, y: 40 },
    });
    environment.handlers.get("canvas-release")({
        position: { x: 50, y: 60 },
    });

    assert.deepEqual(environment.app.annotations, [
        {
            id: "segmentation-1",
            shape: "brush" as const,
            radius: 18,
            points: [
                { x: 10, y: 20 },
                { x: 30, y: 40 },
                { x: 50, y: 60 },
            ],
        },
    ]);
    assert.equal(
        environment.sentMessages.filter((message) => message.payload.type === "segmentation-created").length,
        1,
    );
});

void test("brush ignores a non-primary mouse button", () => {
    const environment = loadViewer();

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
        position: { x: 10, y: 20 },
        originalEvent: { button: 2 },
    });
    environment.handlers.get("canvas-release")({
        position: { x: 30, y: 40 },
        originalEvent: { button: 2 },
    });

    assert.equal(environment.app.annotations.length, 0);
});

void test("an unfinished brush stroke is discarded when the tool changes", () => {
    const environment = loadViewer();

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
        position: { x: 10, y: 20 },
        originalEvent: { button: 0 },
    });

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "circle" },
    });
    environment.handlers.get("canvas-release")({
        position: { x: 30, y: 40 },
    });

    assert.equal(environment.app.annotations.length, 0);
    assert.equal(environment.viewerElement.dataset.tool, "circle");
});

void test("an unfinished drag shape is discarded when the tool changes", () => {
    const environment = loadViewer();

    environment.handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });

    let removedOverlay = null;

    environment.app.viewer.removeOverlay = (element) => {
        removedOverlay = element;
    };

    environment.handlers.get("canvas-press")({
        position: { x: 10, y: 20 },
    });
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "polygon" },
    });
    environment.handlers.get("canvas-release")({
        position: { x: 80, y: 90 },
    });

    assert.ok(removedOverlay);
    assert.equal(environment.app.annotations.length, 0);
    assert.equal(environment.viewerElement.dataset.tool, "polygon");
});

void test("annotation panel tracks drawings and imports, and edits survive export and import", async () => {
    const environment = loadViewer();

    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });

    const element = (id: string) => environment.element(id);

    assert.equal(element("annotation-count").textContent, "0");
    assert.equal(element("annotation-empty").hidden, false);
    assert.equal(environment.input("annotation-name").disabled, true);

    environment.handlers.get("open")();
    environment.handlers.get("canvas-press")({ position: { x: 1, y: 2 } });

    assert.equal(element("annotation-count").textContent, "0");

    environment.handlers.get("canvas-release")({ position: { x: 30, y: 40 } });

    assert.equal(element("annotation-count").textContent, "1");
    assert.equal(element("annotation-empty").hidden, true);
    assert.equal(environment.input("annotation-name").value, "segmentation-1");
    assert.equal(environment.input("annotation-color").value, "#2ecc71");

    environment.input("annotation-name").value = "Healthy tissue";
    environment.fire(environment.input("annotation-name"), "input");
    environment.input("annotation-color").value = "#ed8175";
    environment.fire(environment.input("annotation-color"), "input");

    assert.equal(required(environment.app.annotations[0]).name, "Healthy tissue");
    assert.equal(required(environment.app.annotations[0]).color, "#ed8175");

    const drawing = required(environment.overlays.find((item) => item.dataset.annotationId === "segmentation-1"));

    assert.equal(drawing.classList.contains("selected"), true);
    assert.equal(drawing.style.getPropertyValue("--annotation-color"), "#ed8175");
    assert.equal(element("annotation-list").querySelector(".annotation-row-text span")?.textContent, "Healthy tissue");

    environment.messageHandler({ sourcePluginId: "5e61", payload: { type: "segmentation-export-request" } });

    const exported = environment.getExportedFile();

    assert.equal(required(annotationsFromGeoJson(await exported.text())[0]).name, "Healthy tissue");

    await importFile(environment, exported);

    assert.equal(element("annotation-count").textContent, "2");

    const importedDrawing = required(
        environment.overlays.find((item) => item.dataset.annotationId === "segmentation-2"),
    );

    assert.equal(importedDrawing.classList.contains("selected"), false);

    const importedRow = required(element("annotation-list").children[1]);

    environment.fire(importedRow, "click");

    assert.equal(drawing.classList.contains("selected"), false);
    assert.equal(importedDrawing.classList.contains("selected"), true);
    assert.equal(importedRow.getAttribute("aria-pressed"), "true");
    assert.equal(environment.input("annotation-name").value, "Healthy tissue");
    assert.equal(environment.input("annotation-color").value, "#ed8175");

    environment.input("annotation-name").value = "Imported region";
    environment.fire(environment.input("annotation-name"), "input");

    assert.equal(required(environment.app.annotations[0]).name, "Healthy tissue");
    assert.equal(required(environment.app.annotations[1]).name, "Imported region");
    assert.equal(importedDrawing.classList.contains("selected"), true);

    environment.fire(required(element("annotation-list").children[0]), "click");

    assert.equal(drawing.classList.contains("selected"), true);
    assert.equal(importedDrawing.classList.contains("selected"), false);
});

void test("viewer stays idle until a tool is selected and cancels drawing on deselection", () => {
    const environment = loadViewer();

    function gesture() {
        for (const name of ["canvas-press", "canvas-drag", "canvas-release", "canvas-click"] as const) {
            const event: ViewerToolEvent = { position: { x: 80, y: 90 }, quick: true };

            environment.handlers.get(name)(event);

            assert.equal(event.preventDefaultAction, undefined);
        }

        assert.equal(environment.app.annotations.length, 0);
    }

    assert.equal(environment.viewerElement.dataset.tool, "none");

    gesture();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });
    environment.handlers.get("canvas-press")({ position: { x: 10, y: 20 } });
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "none" },
    });

    assert.equal(environment.viewerElement.dataset.tool, "none");

    gesture();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: { type: "segmentation-tool-changed", tool: "rectangle" },
    });
    environment.handlers.get("canvas-release")({ position: { x: 80, y: 90 } });

    assert.equal(environment.app.annotations.length, 0);
});

void test("opening local images clears old annotations and drafts, and drawing resumes after load", async () => {
    const environment = loadViewer();
    const { app, handlers, window, overlays } = environment;
    const images: HTMLImageElement[] = [];

    window.Image = environment.imageConstructor((image) => images.push(image));
    window.confirm = () => true;

    let sequence = 0;

    window.URL.createObjectURL = () => `blob:image-${++sequence}`;

    const opened: unknown[] = [];

    app.viewer.open = (source) => opened.push(source);
    app.viewer.clearOverlays = () => overlays.splice(0);
    handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {
            type: "segmentation-tool-changed",
            tool: "rectangle",
        },
    });

    const press = () => handlers.get("canvas-press")({ position: { x: 1, y: 2 } });
    const release = () => handlers.get("canvas-release")({ position: { x: 30, y: 40 } });

    press();
    release();
    press(); // An unfinished shape must not carry across images.

    const input = environment.input("open-image-file");

    environment.setFiles(input, [new Blob(["image"])]);
    await environment.change(input);

    assert.deepEqual(opened, [{ type: "image", url: "blob:image-1", buildPyramid: false }]);
    assert.equal(required(images.at(-1)).src, "blob:image-1"); // Smart-brush sampler source.
    assert.equal(app.annotations.length, 0);
    assert.equal(overlays.length, 0);
    assert.equal(environment.element("annotation-count").textContent, "0");

    press();
    release();

    assert.equal(app.annotations.length, 0);

    handlers.get("open")();
    release();

    assert.equal(app.annotations.length, 0);

    press();
    release();

    assert.equal(app.annotations.length, 1);

    await environment.change(input);

    assert.deepEqual(environment.revokedUrls, ["blob:image-1"]);
    assert.equal(required(images.at(-1)).src, "blob:image-2");
    assert.equal(input.value, "");
});

void test("app and global annotation snapshots protect state and reflect later edits", () => {
    const environment = loadViewer();
    const { app, handlers, window } = environment;
    const initial = window.imageViewerAnnotations;

    handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {
            type: "segmentation-tool-changed",
            tool: "brush",
            brushRadius: 4,
        },
    });
    handlers.get("canvas-press")({ position: { x: 1, y: 2 } });
    handlers.get("canvas-release")({ position: { x: 3, y: 4 } });

    const expected = app.annotations;

    required(shape(required(window.imageViewerAnnotations)[0], "brush").points[0]).x = 99;
    shape(app.annotations[0], "brush").points.pop();
    required(window.imageViewerAnnotations).splice(0);

    assert.deepEqual(app.annotations, expected);
    assert.deepEqual(window.imageViewerAnnotations, expected);
    assert.deepEqual(initial, []);

    const nameInput = environment.input("annotation-name");

    nameInput.value = "Renamed";
    environment.fire(nameInput, "input");

    assert.equal(required(app.annotations[0]).name, "Renamed");
    assert.equal(required(required(window.imageViewerAnnotations)[0]).name, "Renamed");
    assert.equal(required(expected[0]).name, undefined);
});

void test("invalid files and cancelled image replacement keep existing annotations", async () => {
    const environment = loadViewer();
    const { app, handlers, window } = environment;

    handlers.get("open")();
    environment.messageHandler({
        sourcePluginId: "5e61",
        payload: {
            type: "segmentation-tool-changed",
            tool: "rectangle",
        },
    });
    handlers.get("canvas-press")({ position: { x: 1, y: 2 } });
    handlers.get("canvas-release")({ position: { x: 30, y: 40 } });

    const before = structuredClone(app.annotations);

    app.viewer.open = () => assert.fail("Must not replace the current image");

    const input = environment.input("open-image-file");

    environment.setFiles(input, [new Blob(["invalid"])]);
    window.Image = environment.imageConstructor((image) => {
        image.decode = () => Promise.reject(new Error("Invalid image"));
    });
    await environment.change(input);

    assert.match(environment.statusElement.textContent, /Could not open this image/);
    assert.deepEqual(app.annotations, before);

    window.Image = environment.imageConstructor();
    window.confirm = () => false;
    await environment.change(input);

    assert.deepEqual(app.annotations, before);
    assert.equal(environment.revokedUrls.length, 2);
    assert.equal(environment.button("open-image").disabled, false);
});

void test("brush settings apply to the next stroke and invalid selections preserve drawing", () => {
    const environment = loadViewer();

    environment.handlers.get("open")();

    const select = (selection: Record<string, unknown>) =>
        environment.messageHandler({
            sourcePluginId: "5e61",
            payload: { type: "segmentation-tool-changed", ...selection },
        });
    const press = () => environment.handlers.get("canvas-press")({ position: { x: 10, y: 20 } });
    const release = () => environment.handlers.get("canvas-release")({ position: { x: 30, y: 40 } });

    select({ tool: "brush" });
    press();
    select({ tool: "brush", brushRadius: 20 });
    release();

    assert.equal(shape(environment.app.annotations[0], "brush").radius, 12);

    press();
    select({ tool: "unknown", brushRadius: 50 });
    release();

    assert.equal(environment.viewerElement.dataset.tool, "brush");
    assert.equal(shape(environment.app.annotations[1], "brush").radius, 20);

    for (const brushRadius of [undefined, null, "30", 0, -1, NaN, Infinity]) {
        select({ tool: "brush", brushRadius });
        press();
        release();

        assert.equal(shape(environment.app.annotations.at(-1), "brush").radius, 20);
    }
});
