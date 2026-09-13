import type { Annotation } from "../plugins/a11e/src/shared/types.js";
import { createDom } from "./helpers/dom.js";
import type { RenderElement } from "../plugins/a11e/src/tools/core/types.js";
import { required, shape } from "./helpers/assertions.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createAnnotationController } from "../plugins/a11e/src/annotations/controller.js";

void test("controller updates and clears visuals before notifying, while reads stay detached", () => {
    const visuals = new Map<string | undefined, Annotation>();
    const observed: Annotation[][] = [];
    const controller = createAnnotationController({
        env: createDom(),
        session: { isImageReady: () => true, reportStatus() {} },
        renderer: {
            finalizePreview() {},
            setSelected() {},
            render(annotation: Annotation) {
                visuals.set(annotation.id, annotation);
            },
            updateAppearance(annotation) {
                visuals.set(annotation.id, annotation);
            },
            removeAnnotation(id) {
                visuals.delete(id);
            },
        },
        toolbar: { publishAnnotation() {} },
    });

    controller.subscribe(() => {
        const snapshot = controller.annotations;

        assert.deepEqual([...visuals.values()], snapshot);

        observed.push(snapshot);
    });

    const first = controller.commitAnnotation({ shape: "rectangle" as const, x: 1, y: 2, width: 3, height: 4 });

    controller.commitAnnotation({ shape: "circle" as const, centerX: 1, centerY: 2, radius: 3 });
    controller.annotations.splice(0);
    shape(required(controller.annotations[0]), "rectangle").x = 99;

    const updated = controller.updateAnnotation(first.id, { name: "Tissue", color: "#112233" });

    assert.equal(shape(required(controller.annotations[0]), "rectangle").x, 1);
    assert.equal(required(updated).name, "Tissue");
    assert.equal(first.name, undefined);

    controller.clearAnnotations();

    assert.deepEqual(controller.annotations, []);
    assert.equal(visuals.size, 0);
    assert.equal(observed.length, 4, "bulk clear notifies once after removing all visuals");
    assert.equal(required(observed[0]).length, 1, "previous snapshots retain their original membership");

    controller.clearAnnotations();

    assert.equal(observed.length, 4, "an empty clear produces no change notification");
});

for (const usePreview of [false, true]) {
    void test(`commit ${usePreview ? "finalizes a preview" : "renders a new annotation"} before publishing and notifying`, () => {
        const env = createDom();
        const preview = env.document.createElement("div");

        preview.classList.add("preview");

        const elements = new Map<string | undefined, RenderElement>();
        const published: Annotation[] = [];
        const observed: Annotation[] = [];
        const renderer = {
            updateAppearance() {},
            removeAnnotation() {},
            setSelected() {},
            render(annotation: Annotation) {
                assert.equal(usePreview, false, "a draft must reuse its preview");

                elements.set(annotation.id, env.document.createElement("div"));
            },
            finalizePreview(element: RenderElement, annotation: Annotation) {
                assert.equal(usePreview, true, "imports have no preview to finalize");
                assert.equal(element, preview);

                element.classList.remove("preview");
                elements.set(annotation.id, element);
            },
        };
        const controller = createAnnotationController({
            env,
            session: { isImageReady: () => true, reportStatus() {} },
            renderer,
            toolbar: {
                publishAnnotation(annotation) {
                    assert.equal(
                        elements.get(annotation.id)?.classList.contains("preview"),
                        false,
                        "published annotations must already have a committed visual",
                    );

                    published.push(annotation);
                },
            },
        });

        controller.subscribe(() => {
            const annotation = required(controller.annotations.at(-1));

            assert.equal(
                elements.get(annotation.id)?.classList.contains("preview"),
                false,
                "subscribers must be able to select the committed visual immediately",
            );

            observed.push(annotation);
        });

        const data: Annotation = { shape: "rectangle" as const, x: 1, y: 2, width: 10, height: 20 };
        const annotation = usePreview ? controller.commitAnnotation(data, preview) : controller.commitAnnotation(data);

        assert.deepEqual(annotation, { id: "segmentation-1", ...data });
        assert.deepEqual(controller.annotations, [annotation]);
        assert.deepEqual(published, [annotation]);
        assert.deepEqual(observed, [annotation]);
        assert.equal(elements.size, 1);

        if (usePreview) {
            assert.equal(elements.get(annotation.id), preview);
        }
    });
}
