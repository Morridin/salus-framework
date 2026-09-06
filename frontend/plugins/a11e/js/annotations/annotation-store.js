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

    return {annotations, create};
}
