import {createAssistedBrushTool} from "../assisted-brush/tool.js";
import {createBrushTool} from "../brush.js";
import {createDragShapeTool} from "../drag-shape.js";
import {createPolygonTool} from "../polygon.js";
import {NO_TOOL, SHAPES, isKnownToolId} from "./registry.js";
import {isFiniteNumber, isPositiveFinite} from "../../shared/numbers.js";

// Owns tool selection, brush settings, and dispatch of viewer input.
export function createToolController({
    document,
    OpenSeadragon,
    session,
    sampler,
    surface,
    renderer,
    commitAnnotation,
}) {
    const {viewer, viewerElement} = session;
    let currentTool = NO_TOOL;
    // Only this controller updates settings; brushes read them at stroke start.
    const brushSettings = {brushRadius: 12, brushTolerance: 24};
    const tools = {
        [SHAPES.RECTANGLE]: createDragShapeTool({
            surface, renderer, commitAnnotation, tool: SHAPES.RECTANGLE,
        }),
        [SHAPES.CIRCLE]: createDragShapeTool({
            surface, renderer, commitAnnotation, tool: SHAPES.CIRCLE,
        }),
        [SHAPES.POLYGON]: createPolygonTool({surface, renderer, commitAnnotation}),
        [SHAPES.BRUSH]: createBrushTool({
            surface, renderer, commitAnnotation, brushSettings,
        }),
        [SHAPES.ASSISTED_BRUSH]: createAssistedBrushTool({
            surface, renderer, commitAnnotation, brushSettings, sampler,
            reportStatus: session.reportStatus,
        }),
    };
    viewerElement.dataset.tool = currentTool;

    function cancelDrawing() {
        tools[currentTool]?.deactivate?.();
    }

    /** @param {{tool?: string, brushRadius?: unknown, brushTolerance?: unknown}} [selection] */
    function selectTool(selection = {}) {
        const {tool = currentTool, brushRadius, brushTolerance} = selection ?? {};
        if (!isKnownToolId(tool)) return {tool: currentTool, ...brushSettings};

        if (tool !== currentTool) cancelDrawing();
        currentTool = tool;
        if (isPositiveFinite(brushRadius)) brushSettings.brushRadius = brushRadius;
        if (isFiniteNumber(brushTolerance) && brushTolerance >= 0) {
            brushSettings.brushTolerance = Math.min(255, brushTolerance);
        }
        viewerElement.dataset.tool = currentTool;
        return {tool: currentTool, ...brushSettings};
    }

    function activeToolHandler(name, event) {
        if (!session.isImageReady()) return;
        if (!tools[currentTool] || !renderer.canRender(currentTool)) return;
        tools[currentTool][name]?.(event);
    }

    viewer.addHandler("canvas-press", event => activeToolHandler("press", event));
    viewer.addHandler("canvas-drag", event => activeToolHandler("drag", event));
    viewer.addHandler("canvas-release", event => activeToolHandler("release", event));
    viewer.addHandler("canvas-click", event => activeToolHandler("click", event));

    const pointerTracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: event => activeToolHandler("pointerMove", event),
    });
    pointerTracker.setTracking(true);

    document.addEventListener("keydown", event =>
        activeToolHandler("keyDown", event)
    );

    return {selectTool, cancelDrawing};
}
