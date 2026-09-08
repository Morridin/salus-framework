import {
    ASSISTED_BRUSH_COLOR,
    COLOR_HEX_PATTERN,
    DEFAULT_ANNOTATION_COLOR,
    SHAPES,
} from "../constants.js";

export function annotationColor(annotation) {
    return COLOR_HEX_PATTERN.test(annotation.color)
        ? annotation.color
        : annotation.shape === SHAPES.ASSISTED_BRUSH ? ASSISTED_BRUSH_COLOR : DEFAULT_ANNOTATION_COLOR;
}

export function annotationName(annotation) {
    return annotation.name ?? annotation.id;
}
