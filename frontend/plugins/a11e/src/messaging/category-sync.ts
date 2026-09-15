import type { AnnotationController } from "../annotations/controller.js";
import type { createToolbarBridge } from "./toolbar-bridge.js";

/** Publishes category changes and keeps drawing previews in sync with the active category. */
export function createCategorySync({
    annotations,
    toolbar,
    setPreviewColor,
}: {
    annotations: Pick<
        AnnotationController,
        "categories" | "activeCategoryId" | "subscribe" | "selectCategory" | "createCategory" | "editCategory"
    >;
    toolbar: Pick<ReturnType<typeof createToolbarBridge>, "publishCategories">;
    setPreviewColor: (color: string | undefined) => void;
}) {
    function publish() {
        toolbar.publishCategories(annotations.categories, annotations.activeCategoryId);
    }

    function updatePreview() {
        setPreviewColor(annotations.categories.find((category) => category.id === annotations.activeCategoryId)?.color);
    }

    let previousState = JSON.stringify([annotations.categories, annotations.activeCategoryId]);

    const dispose = annotations.subscribe(() => {
        const state = JSON.stringify([annotations.categories, annotations.activeCategoryId]);

        if (state === previousState) {
            return;
        }

        previousState = state;
        updatePreview();
        publish();
    });

    updatePreview();

    return {
        publish,
        dispose,
        handlers: {
            onCategoriesRequested: publish,
            onCategorySelected: (id: string | null) => annotations.selectCategory(id),
            onCategorySaved: (name: string, color: string, id?: string) => {
                if (id) {
                    annotations.editCategory(id, name, color);
                } else {
                    annotations.createCategory(name, color);
                }
            },
        },
    };
}
