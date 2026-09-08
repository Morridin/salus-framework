// Central contract for drawing tools.
//
// Every tool is a (possibly partial) set of event handlers plus a
// `deactivate` cleanup. defineTool() normalises factories to that shape so
// the controller can dispatch table-driven without per-tool special cases,
// and documents the interface future tools must implement:
//
//   press / drag / release  - OpenSeadragon canvas gestures
//   click                   - OpenSeadragon canvas click (polygon)
//   pointerMove             - hover preview (polygon)
//   keyDown                 - keyboard commit/cancel (polygon)
//   deactivate              - discard in-progress draft (always present)

/**
 * Event handlers a tool may implement. All are optional except
 * `deactivate`, which defineTool() always supplies.
 *
 * @typedef {object} Tool
 * @property {(event: object) => void} [press]
 * @property {(event: object) => void} [drag]
 * @property {(event: object) => void} [release]
 * @property {(event: object) => void} [click]
 * @property {(event: object) => void} [pointerMove]
 * @property {(event: object) => void} [keyDown]
 * @property {() => void} deactivate
 */

/**
 * Dependencies handed to every tool factory. `getOption(name)` reads the
 * shared settings store, so tools never import settings or the registry's
 * option defaults directly.
 *
 * @typedef {object} ToolContext
 * @property {object} surface coordinate conversion + SVG/overlay helpers
 * @property {object} renderer annotation rendering
 * @property {object} [sampler] intensity sampler (smart tools only)
 * @property {(annotation: object, element: object) => void} commitAnnotation
 * @property {(message: string) => void} [reportStatus]
 * @property {(name: string) => number} getOption
 */

export const TOOL_HANDLER_NAMES = [
    "press",
    "drag",
    "release",
    "click",
    "pointerMove",
    "keyDown",
];

// Viewer event name -> tool handler name pairs. Owned here so the
// controller registers handlers by iterating instead of hardcoding them.
export const VIEWER_EVENT_MAP = [
    ["canvas-press", "press"],
    ["canvas-drag", "drag"],
    ["canvas-release", "release"],
    ["canvas-click", "click"],
];

/**
 * Normalises a partial handler bag to the Tool interface. Unknown keys are
 * ignored so typos fail loudly at the call site (missing behaviour) rather
 * than silently becoming dispatchable events.
 *
 * @param {Partial<Tool>} [handlers]
 * @returns {Tool} normalised tool
 */
export function defineTool(handlers = {}) {
    const tool = {};
    for (const name of TOOL_HANDLER_NAMES) {
        if (typeof handlers[name] === "function") {
            tool[name] = handlers[name];
        }
    }
    tool.deactivate = typeof handlers.deactivate === "function"
        ? handlers.deactivate
        : () => {};
    return tool;
}
