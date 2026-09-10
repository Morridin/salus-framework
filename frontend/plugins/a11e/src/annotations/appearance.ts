import type { Annotation } from "../shared/types.js";
import { SHAPES } from "../tools/core/registry.js";
import { ASSISTED_BRUSH_COLOR, COLOR_HEX_PATTERN, DEFAULT_ANNOTATION_COLOR } from "../shared/annotation-constants.js";

export function annotationColor(annotation: Annotation): string {
    return typeof annotation.color === "string" && COLOR_HEX_PATTERN.test(annotation.color)
        ? annotation.color
        : annotation.shape === SHAPES.ASSISTED_BRUSH
          ? ASSISTED_BRUSH_COLOR
          : DEFAULT_ANNOTATION_COLOR;
}

export function annotationName(annotation: Annotation): string {
    return annotation.name ?? annotation.id ?? "";
}
