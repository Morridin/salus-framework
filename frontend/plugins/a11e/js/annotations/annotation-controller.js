import {createAnnotationStore} from "./annotation-store.js";
import {annotationsToGeoJson} from "./geojson-export.js";
import {annotationsFromGeoJson} from "./geojson-import.js";

// Owns committed annotations and their import/export workflows.
export function createAnnotationController({
    window,
    document,
    renderer,
    publishAnnotation,
    isImageReady,
    reportStatus,
}) {
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
        const annotation = annotationStore.annotations.find(item => item.id === id);
        if (!annotation) return;
        if (typeof changes.name === "string") annotation.name = changes.name;
        if (/^#[0-9a-f]{6}$/i.test(changes.color)) annotation.color = changes.color;
        renderer.updateAppearance(annotation);
        notify();
        return annotation;
    }

    function createAnnotation(annotationData) {
        const annotation = annotationStore.create(annotationData);
        publishAnnotation(annotation);
        notify();
        return annotation;
    }

    function exportAnnotationsAsGeoJson() {
        const geoJson = annotationsToGeoJson(annotationStore.annotations);
        const fileContents = JSON.stringify(geoJson, null, 2);
        const file = new window.Blob(
            [fileContents],
            {type: "application/geo+json"},
        );
        const fileUrl = window.URL.createObjectURL(file);
        const downloadLink = document.createElement("a");

        downloadLink.href = fileUrl;
        downloadLink.download = "segmentations.geojson";
        downloadLink.click();

        window.URL.revokeObjectURL(fileUrl);
    }

    async function importAnnotationsFromGeoJson(file) {
        if (!file) return;

        try {
            const annotations = annotationsFromGeoJson(await file.text());
            if (!isImageReady()) {
                throw new Error("Wait for the image to load before importing annotations.");
            }

            for (const {id, ...annotationData} of annotations) {
                const annotation = createAnnotation(annotationData);
                renderer.render(annotation);
            }

            reportStatus(`Imported ${annotations.length} annotation${annotations.length === 1 ? "" : "s"}.`);
        } catch (error) {
            reportStatus(`Could not import annotations: ${error.message}`);
        }
    }

    return {
        annotations: annotationStore.annotations,
        createAnnotation,
        updateAnnotation,
        selectAnnotation: renderer.setSelected,
        subscribe,
        importAnnotationsFromGeoJson,
        exportAnnotationsAsGeoJson,
    };
}
