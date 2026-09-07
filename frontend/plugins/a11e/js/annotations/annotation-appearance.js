export function annotationColor(annotation) {
    return /^#[0-9a-f]{6}$/i.test(annotation.color)
        ? annotation.color
        : annotation.shape === "assisted-brush" ? "#40c4ff" : "#2ecc71";
}

export function annotationName(annotation) {
    return annotation.name ?? annotation.id;
}
