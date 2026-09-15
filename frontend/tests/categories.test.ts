import assert from "node:assert/strict";
import test from "node:test";
import { startToolbar } from "../plugins/5e61/src/toolbar.js";
import { createDom } from "./helpers/dom.js";
import { required } from "./helpers/assertions.js";
import { createAnnotationController } from "../plugins/a11e/src/annotations/controller.js";
import { annotationColor } from "../plugins/a11e/src/annotations/appearance.js";
import { annotationsToGeoJson } from "../plugins/a11e/src/annotations/io/geojson-export.js";
import { annotationsFromGeoJson } from "../plugins/a11e/src/annotations/io/geojson-import.js";
import type { Annotation } from "../plugins/a11e/src/shared/types.js";

void test("categories drive shared colors, reassignment, and import without changing geometry", async () => {
    const visuals = new Map<string | undefined, string>();

    const controller = createAnnotationController({
        env: createDom(),
        session: { isImageReady: () => true, reportStatus() {} },
        toolbar: { publishAnnotation() {} },
        renderer: {
            render(annotation) {
                visuals.set(annotation.id, annotationColor(annotation));
            },
            updateAppearance(annotation) {
                visuals.set(annotation.id, annotationColor(annotation));
            },
            finalizePreview() {},
            removeAnnotation() {},
            setSelected() {},
        },
    });

    const geometry: Annotation = { shape: "rectangle", x: 1, y: 2, width: 3, height: 4 };

    controller.createCategory("Tissue", "#123456");

    const category = required(controller.categories[0]);
    const first = controller.commitAnnotation(geometry);
    const second = controller.commitAnnotation(geometry);

    assert.equal(first.category?.id, category.id);
    controller.editCategory(category.id, "Tumor", "#abcdef");
    assert.equal(visuals.get(first.id), "#abcdef");
    assert.equal(visuals.get(second.id), "#abcdef");
    assert.equal(controller.summaries[0]?.category?.name, "Tumor");
    assert.equal(first.category?.name, "Tissue", "snapshots remain detached");
    controller.updateAnnotation(second.id, { category: null, color: "#112233" });
    assert.equal(visuals.get(second.id), "#112233");
    controller.editCategory(category.id, "Tumor", "#654321");
    assert.equal(visuals.get(second.id), "#112233");

    const exported = JSON.stringify(annotationsToGeoJson(controller.annotations));

    assert.equal(annotationsFromGeoJson(exported)[0]?.category?.name, "Tumor");
    await controller.importAnnotationsFromGeoJson({ text: () => Promise.resolve(exported) });
    assert.equal(controller.categories.length, 1);
    assert.equal(controller.annotations[2]?.category?.id, category.id);
    assert.equal(controller.annotations[3]?.category, undefined, "legacy colors survive active category imports");
    assert.equal(controller.activeCategoryId, category.id);
    controller.selectCategory(null);
    assert.equal(controller.commitAnnotation(geometry).category, undefined);
    controller.createCategory(" ", "#ffffff");
    controller.editCategory(category.id, "Invalid", "red");
    assert.equal(controller.categories.length, 1);
    assert.equal(controller.categories[0]?.name, "Tumor");

    const feature = required(annotationsToGeoJson(controller.annotations).features[0]);
    const annotation = feature.properties.salus.annotation;

    const invalid = {
        type: "FeatureCollection",
        features: [
            {
                ...feature,
                properties: {
                    ...feature.properties,
                    salus: {
                        ...feature.properties.salus,
                        annotation: { ...annotation, category: { ...annotation.category, color: 42 } },
                    },
                },
            },
        ],
    };

    assert.throws(() => annotationsFromGeoJson(JSON.stringify(invalid)), /Invalid Salus annotation/);
});

void test("toolbar creates, selects and edits categories using viewer state", () => {
    const env = createDom("5e61");
    const messages: PluginProtocol.PluginEnvelope<PluginProtocol.ToolbarToViewerPayload>[] = [];
    let receive: (event: { data: unknown }) => void = () => {};

    startToolbar(env.document, {
        postMessage(message) {
            messages.push(message);
        },
        addEventListener(_type, listener) {
            receive = listener;
        },
    });

    const control = (id: string) => required(env.document.getElementById(id));

    env.fire(control("category-create"), "click");
    assert.equal(control("category-editor").hidden, false);

    const name = required(env.document.querySelector<HTMLInputElement>("#category-name"));

    name.value = "Tissue";
    env.fire(control("category-editor"), "submit");

    const created = required(messages.at(-1)).payload;

    assert.equal(created.type, "category-save");
    assert.equal(created.name, "Tissue");
    assert.equal("id" in created, false);
    receive({
        data: {
            sourcePluginId: "a11e",
            targetPluginId: "5e61",
            payload: {
                type: "categories-state",
                categories: [{ id: "tissue", name: "Tissue", color: "#123456" }],
                activeCategoryId: "tissue",
            },
        },
    });

    const select = required(env.document.querySelector<HTMLSelectElement>("#category-select"));

    assert.equal(select.value, "tissue");
    env.fire(control("category-edit"), "click");
    assert.equal(name.value, "Tissue");
    name.value = "Tumor";
    env.fire(control("category-editor"), "submit");

    const edited = required(messages.at(-1)).payload;

    assert.equal(edited.type, "category-save");
    assert.equal(edited.id, "tissue");
    assert.equal(edited.name, "Tumor");
    select.value = "";
    env.fire(select, "change");

    const selected = required(messages.at(-1)).payload;

    assert.equal(selected.type, "category-select");
    assert.equal(selected.id, null);
});
