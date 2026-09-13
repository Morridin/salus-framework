import type { Shape } from "./types.js";
import { SHAPES } from "./types.js";

export const COLOR_HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const DEFAULT_ANNOTATION_COLOR = "#2ecc71";

export const ASSISTED_BRUSH_COLOR = "#40c4ff";

export const ANNOTATION_FILL_OPACITY: Partial<Record<Shape, string>> & { default: string } = {
    [SHAPES.BRUSH]: "73",
    [SHAPES.ASSISTED_BRUSH]: "7a",
    default: "1f",
};

export const ANNOTATION_ID_PREFIX = "segmentation-";

export const MINIMUM_POINT_DISTANCE = 1;

export const MINIMUM_SHAPE_SIZE = 3;

export function isValidColor(value: unknown): value is string {
    return typeof value === "string" && COLOR_HEX_PATTERN.test(value);
}
