import assert from "node:assert/strict";
import test from "node:test";

import {createAnnotationController} from "../plugins/a11e/js/annotations/annotation-controller.js";

for (const usePreview of [false, true]) {
    test(`commit ${usePreview ? "finalizes a preview" : "renders a new annotation"} before publishing and notifying`, () => {
        const preview = {isPreview: true};
        const elements = new Map();
        const published = [];
        const observed = [];
        const renderer = {
            render(annotation) {
                assert.equal(usePreview, false, "a draft must reuse its preview");
                elements.set(annotation.id, {isPreview: false});
            },
            finalizePreview(element, annotation) {
                assert.equal(usePreview, true, "imports have no preview to finalize");
                assert.equal(element, preview);
                element.isPreview = false;
                elements.set(annotation.id, element);
            },
        };
        const controller = createAnnotationController({
            renderer,
            publishAnnotation(annotation) {
                assert.equal(elements.get(annotation.id)?.isPreview, false,
                    "published annotations must already have a committed visual");
                published.push(annotation);
            },
        });
        controller.subscribe(() => {
            const annotation = controller.annotations.at(-1);
            assert.equal(elements.get(annotation.id)?.isPreview, false,
                "subscribers must be able to select the committed visual immediately");
            observed.push(annotation);
        });

        const data = {shape: "rectangle", x: 1, y: 2, width: 10, height: 20};
        const annotation = usePreview
            ? controller.commitAnnotation(data, preview)
            : controller.commitAnnotation(data);

        assert.deepEqual(annotation, {id: "segmentation-1", ...data});
        assert.deepEqual(controller.annotations, [annotation]);
        assert.deepEqual(published, [annotation]);
        assert.deepEqual(observed, [annotation]);
        assert.equal(elements.size, 1);
        if (usePreview) assert.equal(elements.get(annotation.id), preview);
    });
}
