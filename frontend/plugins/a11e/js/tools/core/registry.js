// Tool identifiers shared by drawing, annotation rendering, and messaging.
export const NO_TOOL = "none";

export const SHAPES = {
    RECTANGLE: "rectangle",
    CIRCLE: "circle",
    POLYGON: "polygon",
    BRUSH: "brush",
    ASSISTED_BRUSH: "assisted-brush",
};

export const TOOL_IDS = Object.values(SHAPES);

/** @param {unknown} id */
export function isKnownToolId(id) {
    return id === NO_TOOL || TOOL_IDS.includes(id);
}
