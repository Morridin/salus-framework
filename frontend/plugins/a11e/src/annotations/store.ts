import type { Annotation, AnnotationChanges, AnnotationSummary, CommittedAnnotation } from "../shared/types.js";
import { ANNOTATION_ID_PREFIX, isValidColor } from "../shared/annotation-constants.js";

export function createAnnotationStore() {
    const annotations: CommittedAnnotation[] = [];
    let sequence = 0;

    // Clone both incoming data and outgoing snapshots, including nested geometry.
    function add(annotationData: Annotation): CommittedAnnotation {
        const annotation = {
            ...structuredClone(annotationData),
            id: `${ANNOTATION_ID_PREFIX}${++sequence}`,
        };

        annotations.push(annotation);

        return structuredClone(annotation);
    }

    function list() {
        return structuredClone(annotations);
    }

    function get(id: string) {
        return structuredClone(annotations.find((annotation) => annotation.id === id));
    }

    // Appearance is editable; identity and committed geometry remain unchanged.
    function update(id: string | null, changes: AnnotationChanges) {
        const annotation = annotations.find((item) => item.id === id);

        if (!annotation) {
            return;
        }

        if (typeof changes.name === "string") {
            annotation.name = changes.name;
        }

        if (isValidColor(changes.color)) {
            annotation.color = changes.color;
        }

        return structuredClone(annotation);
    }

    function remove(id: string | null) {
        const index = annotations.findIndex((annotation) => annotation.id === id);

        if (index === -1) {
            return;
        }

        return structuredClone(annotations.splice(index, 1)[0]);
    }

    function clear() {
        return structuredClone(annotations.splice(0));
    }

    function summarize(annotation: CommittedAnnotation): AnnotationSummary {
        const summary: AnnotationSummary = { id: annotation.id, shape: annotation.shape };

        if (annotation.name !== undefined) {
            summary.name = annotation.name;
        }

        if (annotation.color !== undefined) {
            summary.color = annotation.color;
        }

        return summary;
    }

    // Lightweight display rows: committed geometry is never copied.
    function summaries() {
        return annotations.map(summarize);
    }

    // Live read-only view for synchronous consumers; never mutate or retain it across writes.
    function view(): readonly CommittedAnnotation[] {
        return annotations;
    }

    return {
        add,
        update,
        remove,
        clear,
        get,
        list,
        summaries,
        view,
        get count() {
            return annotations.length;
        },
    };
}
