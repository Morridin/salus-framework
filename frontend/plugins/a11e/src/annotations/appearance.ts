import type { AnnotationCategory, Shape } from "../shared/types.js";
import { SHAPES } from "../shared/types.js";
import { ASSISTED_BRUSH_COLOR, COLOR_HEX_PATTERN, DEFAULT_ANNOTATION_COLOR } from "../shared/annotation-constants.js";

/** Appearance fields shared by committed annotations and their panel summaries. */
interface AnnotationDisplay {
    category?: AnnotationCategory;
    id?: string;
    name?: string;
    color?: string;
    shape: Shape;
}

export function annotationColor(annotation: AnnotationDisplay): string {
    if (annotation.category) {
        return annotation.category.color;
    }

    return typeof annotation.color === "string" && COLOR_HEX_PATTERN.test(annotation.color)
        ? annotation.color
        : annotation.shape === SHAPES.ASSISTED_BRUSH
          ? ASSISTED_BRUSH_COLOR
          : DEFAULT_ANNOTATION_COLOR;
}

export function annotationName(annotation: AnnotationDisplay): string {
    return annotation.name ?? annotation.id ?? "";
}
