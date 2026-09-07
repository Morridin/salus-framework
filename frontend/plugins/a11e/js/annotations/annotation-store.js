export function createAnnotationStore() {
    const annotations = [];
    let sequence = 0;

    function create(annotationData) {
        const annotation = {
            id: `segmentation-${++sequence}`,
            ...annotationData,
        };

        annotations.push(annotation);
        return annotation;
    }

    function remove(id) {
        const index = annotations.findIndex(annotation => annotation.id === id);
        if (index === -1) return;
        return annotations.splice(index, 1)[0];
    }

    return {annotations, create, remove};
}
