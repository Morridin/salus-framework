import type { Annotation, AnnotationChanges, CommittedAnnotation } from "../shared/types.js";
import type { BrowserEnvironment } from "../shared/environment.js";
import type { RenderElement } from "./renderer.js";
import type { TextFile } from "./io/geojson-import.js";
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
    readonly annotations: CommittedAnnotation[];
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

    const listeners = new Set<() => void>();

    function subscribe(listener: () => void) {
        listeners.add(listener);

        return () => listeners.delete(listener);
    }

    function notify() {
        listeners.forEach((listener) => listener());
    }

    function updateAnnotation(id: string | null, changes: AnnotationChanges) {
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
    function commitAnnotation(annotationData: Annotation, preview: RenderElement | null = null) {
        const annotation = annotationStore.add(annotationData);

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
                commitAnnotation(annotationData);
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
        get annotations() {
            return annotationStore.list();
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
