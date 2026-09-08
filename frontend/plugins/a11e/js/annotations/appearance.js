import {SHAPES} from "../tools/core/registry.js";
import {
    ASSISTED_BRUSH_COLOR,
    COLOR_HEX_PATTERN,
    DEFAULT_ANNOTATION_COLOR,
} from "../shared/annotation-constants.js";

/**
 * @typedef {import('../shared/types.js').Annotation} Annotation
 */

/**
 * @param {Annotation} annotation committed annotation (always has id)
 * @returns {string} hex color to render with
 */
export function annotationColor(annotation) {
    return COLOR_HEX_PATTERN.test(annotation.color)
        ? annotation.color
        : annotation.shape === SHAPES.ASSISTED_BRUSH ? ASSISTED_BRUSH_COLOR : DEFAULT_ANNOTATION_COLOR;
}

/**
 * @param {Annotation} annotation committed annotation (always has id)
 * @returns {string} display name (name fallback to id)
 */
export function annotationName(annotation) {
    return annotation.name ?? annotation.id;
}
