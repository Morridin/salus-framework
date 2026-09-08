// Visual defaults and domain limits for annotations. Tool identity lives in
// tools/core/registry.js — import SHAPES from there, not from here.
import {SHAPES} from "../tools/core/registry.js";

export const COLOR_HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const DEFAULT_ANNOTATION_COLOR = "#2ecc71";
export const ASSISTED_BRUSH_COLOR = "#40c4ff";

export const ANNOTATION_FILL_OPACITY = {
    [SHAPES.BRUSH]: "73",
    [SHAPES.ASSISTED_BRUSH]: "7a",
    default: "1f",
};

export const ANNOTATION_ID_PREFIX = "segmentation-";

export const MINIMUM_POINT_DISTANCE = 1;
export const MINIMUM_SHAPE_SIZE = 3;

export function isValidColor(value) {
    return typeof value === "string" && COLOR_HEX_PATTERN.test(value);
}
