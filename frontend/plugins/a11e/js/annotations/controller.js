import {createAnnotationStore} from "./store.js";
import {annotationsToGeoJson} from "./io/geojson-export.js";
import {annotationsFromGeoJson} from "./io/geojson-import.js";
import {downloadTextFile} from "../shared/download-file.js";

// Owns committed annotations and their import/export workflows.
export function createAnnotationController({env, session, renderer, toolbar}) {
    const {publishAnnotation} = toolbar;
    const {isImageReady, reportStatus} = session;
    const annotationStore = createAnnotationStore();

    const listeners = new Set();

    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    function notify() {
        listeners.forEach(listener => listener());
    }

    function updateAnnotation(id, changes) {
        const annotation = annotationStore.update(id, changes);
        if (!annotation) return;
        renderer.updateAppearance(annotation);
        notify();
        return annotation;
    }

    // Complete the visual before publishing or notifying subscribers.
    // Drawing tools supply their preview; imports render a new element.
    function commitAnnotation(annotationData, preview = null) {
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

    function deleteAnnotation(id) {
        const annotation = annotationStore.remove(id);
        if (!annotation) return;
        renderer.removeAnnotation(id);
        notify();
        reportStatus("Annotation deleted.");
    }

    function exportAnnotationsAsGeoJson() {
        const geoJson = annotationsToGeoJson(annotationStore.list());
        downloadTextFile(
            env,
            "segmentations.geojson",
            JSON.stringify(geoJson, null, 2),
            "application/geo+json",
        );
    }

    async function importAnnotationsFromGeoJson(file) {
        if (!file) return;

        try {
            const annotations = annotationsFromGeoJson(await file.text());
            if (!isImageReady()) {
                throw new Error("Wait for the image to load before importing annotations.");
            }

            for (const {id, ...annotationData} of annotations) {
                commitAnnotation(annotationData);
            }

            reportStatus(`Imported ${annotations.length} annotation${annotations.length === 1 ? "" : "s"}.`);
        } catch (error) {
            reportStatus(`Could not import annotations: ${error.message}`);
        }
    }

    function clearAnnotations() {
        const removed = annotationStore.clear();
        if (removed.length === 0) return;
        for (const annotation of removed) renderer.removeAnnotation(annotation.id);
        notify();
    }

    return {
        get annotations() { return annotationStore.list(); },
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
