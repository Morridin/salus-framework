// Single source of truth for drawing tools.
//
// TOOL_DEFS is the canonical list of selectable tools. It owns tool
// identity, the interaction kind, human labels, and which options each tool
// needs. Defaults and sanitizers for those options live in
// TOOL_OPTION_DEFS below, so settings, validation, and dispatch all derive
// from this list instead of scattered string literals.
//
// Adding a tool means one entry here plus one factory line in
// tool-controller.js; validation, settings, and dispatch pick it up
// automatically.
//
// This module is intentionally a leaf: it only imports numbers.js, so
// tools, the renderer, settings, and the toolbar bridge can all share it
// without import cycles.
import {asFiniteNumber} from "../../shared/numbers.js";

/**
 * Interaction pattern of a tool. Informational: documents which handlers a
 * tool is expected to implement (drag = press/drag/release,
 * click = click/pointerMove/keyDown, stroke = press/drag/release).
 *
 * @typedef {"drag" | "click" | "stroke"} ToolKind
 */

/**
 * Canonical option names. Tools request values at runtime via
 * `getOption(TOOL_OPTIONS.BRUSH_RADIUS)` so adding an option never changes
 * the tool-construction plumbing.
 */
export const TOOL_OPTIONS = {
    BRUSH_RADIUS: "brushRadius",
    BRUSH_TOLERANCE: "brushTolerance",
};

export const MAX_BRUSH_TOLERANCE = 255;

/**
 * Sanitizer contract: returns a usable value, or null to keep the current
 * setting (covers null/undefined/NaN/out-of-range uniformly).
 *
 * @typedef {(value: unknown) => number | null} OptionSanitizer
 */

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function sanitizeBrushRadius(value) {
    const radius = asFiniteNumber(value);
    return radius > 0 ? radius : null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function sanitizeBrushTolerance(value) {
    const tolerance = asFiniteNumber(value);
    if (!(tolerance >= 0)) return null;
    return Math.min(MAX_BRUSH_TOLERANCE, tolerance);
}

/**
 * @typedef {object} ToolOptionDef
 * @property {number} defaultValue
 * @property {OptionSanitizer} sanitize
 */

/** @type {Record<string, ToolOptionDef>} */
export const TOOL_OPTION_DEFS = {
    [TOOL_OPTIONS.BRUSH_RADIUS]: {
        defaultValue: 12,
        sanitize: sanitizeBrushRadius,
    },
    [TOOL_OPTIONS.BRUSH_TOLERANCE]: {
        defaultValue: 24,
        sanitize: sanitizeBrushTolerance,
    },
};

export const TOOL_KINDS = {
    DRAG: "drag",
    CLICK: "click",
    STROKE: "stroke",
};

export const NO_TOOL = "none";

export const SHAPES = {
    RECTANGLE: "rectangle",
    CIRCLE: "circle",
    POLYGON: "polygon",
    BRUSH: "brush",
    ASSISTED_BRUSH: "assisted-brush",
};

/**
 * Central tool contract. `options` lists TOOL_OPTIONS keys the tool reads
 * via `getOption(name)`; the controller wires that accessor from the
 * shared settings store, so tools never reach into settings directly.
 *
 * @typedef {object} ToolDefinition
 * @property {string} id
 * @property {ToolKind} kind
 * @property {string} label
 * @property {string[]} options
 */

/** @type {ToolDefinition[]} */
export const TOOL_DEFS = [
    {
        id: SHAPES.RECTANGLE,
        kind: TOOL_KINDS.DRAG,
        label: "Rectangle",
        options: [],
    },
    {
        id: SHAPES.CIRCLE,
        kind: TOOL_KINDS.DRAG,
        label: "Circle",
        options: [],
    },
    {
        id: SHAPES.POLYGON,
        kind: TOOL_KINDS.CLICK,
        label: "Polygon",
        options: [],
    },
    {
        id: SHAPES.BRUSH,
        kind: TOOL_KINDS.STROKE,
        label: "Brush",
        options: [TOOL_OPTIONS.BRUSH_RADIUS],
    },
    {
        id: SHAPES.ASSISTED_BRUSH,
        kind: TOOL_KINDS.STROKE,
        label: "Smart brush",
        options: [
            TOOL_OPTIONS.BRUSH_RADIUS,
            TOOL_OPTIONS.BRUSH_TOLERANCE,
        ],
    },
];

export const TOOL_IDS = TOOL_DEFS.map(def => def.id);

export const VALID_TOOLS = new Set([NO_TOOL, ...TOOL_IDS]);

/**
 * @param {unknown} id
 * @returns {boolean}
 */
export function isKnownToolId(id) {
    return id === NO_TOOL || TOOL_DEFS.some(def => def.id === id);
}

/**
 * @param {unknown} id
 * @returns {ToolDefinition | null}
 */
export function getToolDef(id) {
    return TOOL_DEFS.find(def => def.id === id) ?? null;
}

/**
 * Defaults for every known option, derived from TOOL_OPTION_DEFS so the
 * settings store never hardcodes them.
 *
 * @returns {Record<string, number>}
 */
export function getDefaultToolOptions() {
    return Object.fromEntries(
        Object.entries(TOOL_OPTION_DEFS).map(([name, def]) => [name, def.defaultValue]),
    );
}

/**
 * Sanitizes one option value with its registered rule.
 *
 * @param {string} name
 * @param {unknown} value
 * @returns {number | null} usable value, or null to keep current
 */
export function sanitizeToolOption(name, value) {
    return TOOL_OPTION_DEFS[name]?.sanitize(value) ?? null;
}
