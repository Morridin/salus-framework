import type { BrowserEnvironment } from "../../shared/environment.js";
import type { ViewerSession } from "../../viewer/viewer-session.js";
import type { ViewerEvent, ViewerEventName, ViewerToolEvent } from "../../viewer/types.js";
import type { Shape, ToolId } from "../../shared/types.js";
import type { Tool, ToolContext, ToolSelection, IntensitySampler } from "./types.js";
import { createAssistedBrushTool } from "../assisted-brush/tool.js";
import { createBrushTool } from "../brush.js";
import { createDragShapeTool } from "../drag-shape.js";
import { createPolygonTool } from "../polygon.js";
import { SHAPES } from "../../shared/types.js";
import { NO_TOOL } from "./registry.js";
import { isFiniteNumber, isPositiveFinite } from "../../shared/numbers.js";

interface ControllerOptions extends Omit<ToolContext, "commitAnnotation"> {
    env: Pick<BrowserEnvironment, "document" | "OpenSeadragon">;
    session: Pick<ViewerSession, "viewer" | "viewerElement" | "isImageReady" | "reportStatus">;
    sampler: IntensitySampler;
    annotations: Pick<ToolContext, "commitAnnotation">;
}

// Owns tool selection, brush settings, and dispatch of viewer input.
export function createToolController({ env, session, sampler, surface, renderer, annotations }: ControllerOptions) {
    const { document, OpenSeadragon } = env;
    const { viewer, viewerElement } = session;
    let currentTool: ToolId = NO_TOOL;
    // Only this controller updates settings; brushes read them at stroke start.
    const brushSettings = { brushRadius: 12, brushTolerance: 24 };
    const tools: Record<Shape, Tool> = {
        [SHAPES.RECTANGLE]: createDragShapeTool({
            surface,
            renderer,
            commitAnnotation: annotations.commitAnnotation,
            tool: SHAPES.RECTANGLE,
        }),
        [SHAPES.CIRCLE]: createDragShapeTool({
            surface,
            renderer,
            commitAnnotation: annotations.commitAnnotation,
            tool: SHAPES.CIRCLE,
        }),
        [SHAPES.POLYGON]: createPolygonTool({
            surface,
            renderer,
            commitAnnotation: annotations.commitAnnotation,
        }),
        [SHAPES.BRUSH]: createBrushTool({
            surface,
            renderer,
            commitAnnotation: annotations.commitAnnotation,
            brushSettings,
        }),
        [SHAPES.ASSISTED_BRUSH]: createAssistedBrushTool({
            surface,
            renderer,
            commitAnnotation: annotations.commitAnnotation,
            brushSettings,
            sampler,
            reportStatus: session.reportStatus,
        }),
    };

    viewerElement.dataset.tool = currentTool;

    function cancelDrawing() {
        if (currentTool !== NO_TOOL) {
            tools[currentTool].deactivate?.();
        }
    }

    function selectTool(selection: ToolSelection = {}) {
        const { tool = currentTool, brushRadius, brushTolerance } = selection;

        if (tool !== currentTool) {
            cancelDrawing();
        }

        currentTool = tool;

        if (isPositiveFinite(brushRadius)) {
            brushSettings.brushRadius = brushRadius;
        }

        if (isFiniteNumber(brushTolerance) && brushTolerance >= 0) {
            brushSettings.brushTolerance = Math.min(255, brushTolerance);
        }

        viewerElement.dataset.tool = currentTool;

        return { tool: currentTool, ...brushSettings };
    }

    function activeToolHandler(name: Exclude<keyof Tool, "deactivate">, event: ViewerToolEvent) {
        if (currentTool === NO_TOOL || !session.isImageReady()) {
            return;
        }

        const tool = tools[currentTool];

        if (!renderer.canRender(currentTool)) {
            return;
        }

        tool[name]?.(event);
    }

    const canvasHandlers: [ViewerEventName, (event: ViewerEvent) => void][] = [
        ["canvas-press", (event) => activeToolHandler("press", event)],
        ["canvas-drag", (event) => activeToolHandler("drag", event)],
        ["canvas-release", (event) => activeToolHandler("release", event)],
        ["canvas-click", (event) => activeToolHandler("click", event)],
    ];

    for (const [eventName, handler] of canvasHandlers) {
        viewer.addHandler(eventName, handler);
    }

    const pointerTracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: (event) => activeToolHandler("pointerMove", event),
    });

    pointerTracker.setTracking(true);

    function onKeyDown(event: KeyboardEvent) {
        activeToolHandler("keyDown", event);
    }

    document.addEventListener("keydown", onKeyDown);

    function dispose() {
        for (const [eventName, handler] of canvasHandlers) {
            viewer.removeHandler(eventName, handler);
        }

        pointerTracker.destroy();
        document.removeEventListener("keydown", onKeyDown);
        cancelDrawing();
    }

    return { selectTool, cancelDrawing, dispose };
}
