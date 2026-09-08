// Single source of truth for annotation domain values previously
// scattered as string/number literals across store, renderer, tools,
// and the toolbar bridge.
export const SHAPES = Object.freeze({
    RECTANGLE: "rectangle",
    CIRCLE: "circle",
    POLYGON: "polygon",
    BRUSH: "brush",
    ASSISTED_BRUSH: "assisted-brush",
});

export const NO_TOOL = "none";

export const VALID_TOOLS = new Set([NO_TOOL, ...Object.values(SHAPES)]);

export const COLOR_HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const DEFAULT_ANNOTATION_COLOR = "#2ecc71";
export const ASSISTED_BRUSH_COLOR = "#40c4ff";

export const ANNOTATION_FILL_OPACITY = Object.freeze({
    [SHAPES.BRUSH]: "73",
    [SHAPES.ASSISTED_BRUSH]: "7a",
    default: "1f",
});

export const ANNOTATION_ID_PREFIX = "segmentation-";

export const MINIMUM_POINT_DISTANCE = 1;
export const MINIMUM_SHAPE_SIZE = 3;

export function isValidColor(value) {
    return typeof value === "string" && COLOR_HEX_PATTERN.test(value);
}
