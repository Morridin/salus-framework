import {createAssistedBrushTool} from "./assisted-brush/tool.js";
import {createBrushTool} from "./brush.js";
import {createDragShapeTool} from "./drag-shape.js";
import {createPolygonTool} from "./polygon.js";
import {createIntensitySampler} from "./assisted-brush/sampler.js";

// Owns drawing tools, their settings, and dispatch of viewer input.
export function createToolController({
    window,
    document,
    OpenSeadragon,
    viewer,
    viewerElement,
    imageUrl,
    surface,
    renderer,
    createAnnotation,
    reportStatus,
}) {
    let activeTool = "none";
    let brushRadius = 12;
    let brushTolerance = 24;
    viewerElement.dataset.tool = activeTool;

    const intensitySampler = createIntensitySampler({window, document, imageUrl});
    const tools = {
        rectangle: createDragShapeTool({
            surface,
            renderer,
            tool: "rectangle",
            createAnnotation,
        }),
        circle: createDragShapeTool({
            surface,
            renderer,
            tool: "circle",
            createAnnotation,
        }),
        polygon: createPolygonTool({surface, renderer, createAnnotation}),
        brush: createBrushTool({
            surface,
            renderer,
            createAnnotation,
            getRadius: () => brushRadius,
        }),
        "assisted-brush": createAssistedBrushTool({
            surface,
            renderer,
            sampler: intensitySampler,
            createAnnotation,
            getRadius: () => brushRadius,
            getTolerance: () => brushTolerance,
            reportStatus,
        }),
    };

    function activeToolHandler(name, event) {
        if (!tools[activeTool] || !renderer.canRender(activeTool)) return;
        tools[activeTool][name]?.(event);
    }

    viewer.addHandler("canvas-press", event => activeToolHandler("press", event));
    viewer.addHandler("canvas-drag", event => activeToolHandler("drag", event));
    viewer.addHandler("canvas-release", event =>
        activeToolHandler("release", event)
    );
    viewer.addHandler("canvas-click", event => activeToolHandler("click", event));

    const pointerTracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: event => activeToolHandler("pointerMove", event),
    });
    pointerTracker.setTracking(true);

    document.addEventListener("keydown", event =>
        activeToolHandler("keyDown", event)
    );

    function selectTool(tool, nextBrushRadius, nextBrushTolerance) {
        if (activeTool !== tool) {
            tools[activeTool]?.deactivate?.();
        }
        activeTool = tool;
        if (nextBrushRadius !== null) {
            brushRadius = nextBrushRadius;
        }
        if (nextBrushTolerance !== null) {
            brushTolerance = nextBrushTolerance;
        }
        viewerElement.dataset.tool = tool;
    }

    return {selectTool};
}
