import type { Shape, ToolId } from "../../shared/types.js";
import { SHAPES } from "../../shared/types.js";

// Tool identifiers shared by drawing and messaging.
export const NO_TOOL = "none" satisfies ToolId;

export const TOOL_IDS: readonly Shape[] = Object.values(SHAPES);

export function isKnownToolId(id: unknown): id is ToolId {
    return id === NO_TOOL || TOOL_IDS.some((tool) => tool === id);
}
