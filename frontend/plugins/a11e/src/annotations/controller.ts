import type {
    AnnotationCategory,
    Annotation,
    AnnotationChanges,
    AnnotationSummary,
    CommittedAnnotation,
} from "../shared/types.js";
import type { BrowserEnvironment } from "../shared/environment.js";
import type { RenderElement } from "./renderer.js";
import type { TextFile } from "./io/geojson-import.js";
import { isValidColor } from "../shared/annotation-constants.js";
import { errorMessage } from "../shared/validation.js";
import { createAnnotationStore } from "./store.js";
import { annotationsToGeoJson } from "./io/geojson-export.js";
import { annotationsFromGeoJson } from "./io/geojson-import.js";
import { downloadTextFile } from "../shared/download-file.js";

interface ControllerOptions {
    env: Pick<BrowserEnvironment, "window" | "document">;
    session: { isImageReady: () => boolean; reportStatus: (message: string) => void };
    toolbar: { publishAnnotation: (annotation: CommittedAnnotation) => void };
    renderer: {
        render(annotation: Annotation): void;
        updateAppearance(annotation: Annotation): void;
        finalizePreview(element: RenderElement, annotation: Annotation): void;
        removeAnnotation(id: string): void;
        setSelected(this: void, id: string | null): void;
    };
}

export interface AnnotationController {
    readonly categories: AnnotationCategory[];
    readonly activeCategoryId: string | null;
    createCategory(name: string, color: string): void;
    editCategory(id: string, name: string, color: string): void;
    selectCategory(id: string | null): void;
    /** Owned deep copies: callers may mutate and retain them. */
    readonly annotations: CommittedAnnotation[];
    /** Lightweight display rows for the panel. */
    readonly summaries: readonly AnnotationSummary[];
    readonly count: number;
    commitAnnotation(this: void, annotationData: Annotation, preview?: RenderElement | null): CommittedAnnotation;
    updateAnnotation(id: string | null, changes: AnnotationChanges): CommittedAnnotation | undefined;
    deleteAnnotation(id: string | null): void;
    clearAnnotations(): void;
    selectAnnotation(id: string | null): void;
    subscribe(listener: () => void): () => void;
    importAnnotationsFromGeoJson(this: void, file: TextFile): Promise<void>;
    exportAnnotationsAsGeoJson(this: void): void;
}

// Owns committed annotations and their import/export workflows.
export function createAnnotationController({
    env,
    session,
    renderer,
    toolbar,
}: ControllerOptions): AnnotationController {
    const { publishAnnotation } = toolbar;
    const { isImageReady, reportStatus } = session;
    const annotationStore = createAnnotationStore();

    const categories: AnnotationCategory[] = [];
    let activeCategoryId: string | null = null;

    function createCategory(name: string, color: string) {
        if (!name.trim() || !isValidColor(color)) {
            return;
        }

        const category = { id: crypto.randomUUID(), name: name.trim(), color };

        categories.push(category);
        activeCategoryId = category.id;
        notify();
    }

    function selectCategory(id: string | null) {
        if (id !== null && !categories.some((category) => category.id === id)) {
            return;
        }

        activeCategoryId = id;
        notify();
    }

    function editCategory(id: string, name: string, color: string) {
        const category = categories.find((item) => item.id === id);

        if (!category || !name.trim() || !isValidColor(color)) {
            return;
        }

        Object.assign(category, { name: name.trim(), color });

        for (const annotation of annotationStore.view()) {
            if (annotation.category?.id === id) {
                const updated = annotationStore.update(annotation.id, { category });

                if (updated) {
                    renderer.updateAppearance(updated);
                }
            }
        }

        notify();
    }

    const listeners = new Set<() => void>();

    function subscribe(listener: () => void) {
        listeners.add(listener);

        return () => listeners.delete(listener);
    }

    function notify() {
        listeners.forEach((listener) => listener());
    }

    function updateAnnotation(id: string | null, changes: AnnotationChanges) {
        if (changes.category) {
            const category = categories.find((item) => item.id === changes.category?.id);

            if (!category) {
                return;
            }

            changes = { ...changes, category };
        }

        const annotation = annotationStore.update(id, changes);

        if (!annotation) {
            return;
        }

        renderer.updateAppearance(annotation);

        notify();

        return annotation;
    }

    // Complete the visual before publishing or notifying subscribers.
    // Drawing tools supply their preview; imports render a new element.
    function commitAnnotation(
        annotationData: Annotation,
        preview: RenderElement | null = null,
        useActiveCategory = true,
    ) {
        const category =
            annotationData.category ??
            (useActiveCategory ? categories.find((item) => item.id === activeCategoryId) : undefined);

        const annotation = annotationStore.add(category ? { ...annotationData, category } : annotationData);

        if (preview) {
            renderer.finalizePreview(preview, annotation);
        } else {
            renderer.render(annotation);
        }

        publishAnnotation(annotation);
        notify();

        return annotation;
    }

    function deleteAnnotation(id: string | null) {
        const annotation = annotationStore.remove(id);

        if (!annotation) {
            return;
        }

        renderer.removeAnnotation(annotation.id);

        notify();
        reportStatus("Annotation deleted.");
    }

    function exportAnnotationsAsGeoJson() {
        const geoJson = annotationsToGeoJson(annotationStore.list());

        downloadTextFile(env, "segmentations.geojson", JSON.stringify(geoJson, null, 2), "application/geo+json");
    }

    async function importAnnotationsFromGeoJson(file: TextFile) {
        try {
            const annotations = annotationsFromGeoJson(await file.text());

            if (!isImageReady()) {
                throw new Error("Wait for the image to load before importing annotations.");
            }

            for (const annotationData of annotations) {
                if (annotationData.category) {
                    const imported = annotationData.category;

                    let category = categories.find(
                        (item) => item.name === imported.name && item.color === imported.color,
                    );

                    if (!category) {
                        category = { ...imported, id: crypto.randomUUID() };
                        categories.push(category);
                    }

                    annotationData.category = category;
                }

                // Legacy imports retain their original appearance, regardless of the drawing category.
                commitAnnotation(annotationData, null, false);
            }

            reportStatus(`Imported ${annotations.length} annotation${annotations.length === 1 ? "" : "s"}.`);
        } catch (error) {
            reportStatus(`Could not import annotations: ${errorMessage(error)}`);
        }
    }

    function clearAnnotations() {
        const removed = annotationStore.clear();

        if (removed.length === 0) {
            return;
        }

        for (const annotation of removed) {
            renderer.removeAnnotation(annotation.id);
        }

        notify();
    }

    return {
        get categories() {
            return structuredClone(categories);
        },
        get activeCategoryId() {
            return activeCategoryId;
        },
        createCategory,
        editCategory,
        selectCategory,
        get annotations() {
            return annotationStore.list();
        },
        get summaries() {
            return annotationStore.summaries();
        },
        get count() {
            return annotationStore.count;
        },
        commitAnnotation,
        updateAnnotation,
        deleteAnnotation,
        clearAnnotations,
        selectAnnotation: renderer.setSelected,
        subscribe,
        importAnnotationsFromGeoJson,
        exportAnnotationsAsGeoJson,
    };
}
