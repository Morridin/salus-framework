import type { Shape, ToolId } from "../../shared/types.js";

// Tool identifiers shared by drawing, annotation rendering, and messaging.
export const NO_TOOL = "none" satisfies ToolId;

export const SHAPES = {
    RECTANGLE: "rectangle",
    CIRCLE: "circle",
    POLYGON: "polygon",
    BRUSH: "brush",
    ASSISTED_BRUSH: "assisted-brush",
} as const satisfies Record<string, Shape>;

export const TOOL_IDS: readonly Shape[] = Object.values(SHAPES);

export function isKnownToolId(id: unknown): id is ToolId {
    return id === NO_TOOL || TOOL_IDS.some((tool) => tool === id);
}
