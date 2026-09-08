import {createAssistedBrushTool} from "../assisted-brush/tool.js";
import {createBrushTool} from "../brush.js";
import {createDragShapeTool} from "../drag-shape.js";
import {createPolygonTool} from "../polygon.js";
import {VIEWER_EVENT_MAP} from "./base.js";
import {SHAPES, TOOL_DEFS, isKnownToolId} from "./registry.js";
import {createToolSettings} from "./settings.js";

// Maps registry ids to factories. Adding a tool = one TOOL_DEFS entry in
// registry.js plus one line here; dispatch, validation, and settings derive
// from the registry instead of hardcoded maps. Every factory receives the
// same ToolContext ({surface, renderer, sampler, commitAnnotation,
// reportStatus, getOption}) so tools declare their option needs in the
// registry rather than via bespoke constructor closures.
function buildTools(context) {
    const {surface, renderer, sampler, commitAnnotation, reportStatus, getOption} = context;
    const factories = {
        [SHAPES.RECTANGLE]: () => createDragShapeTool({
            surface,
            renderer,
            tool: SHAPES.RECTANGLE,
            commitAnnotation,
        }),
        [SHAPES.CIRCLE]: () => createDragShapeTool({
            surface,
            renderer,
            tool: SHAPES.CIRCLE,
            commitAnnotation,
        }),
        [SHAPES.POLYGON]: () => createPolygonTool({surface, renderer, commitAnnotation}),
        [SHAPES.BRUSH]: () => createBrushTool({
            surface,
            renderer,
            commitAnnotation,
            getOption,
        }),
        [SHAPES.ASSISTED_BRUSH]: () => createAssistedBrushTool({
            surface,
            renderer,
            sampler,
            commitAnnotation,
            getOption,
            reportStatus,
        }),
    };
    const missing = TOOL_DEFS.filter(def => typeof factories[def.id] !== "function");
    if (missing.length > 0) {
        throw new Error(
            `Missing tool factories for: ${missing.map(def => def.id).join(", ")}`,
        );
    }
    const extra = Object.keys(factories).filter(id => !isKnownToolId(id));
    if (extra.length > 0) {
        throw new Error(`Unknown tool factories for: ${extra.join(", ")}`);
    }
    return Object.fromEntries(
        TOOL_DEFS.map(def => [def.id, factories[def.id]()]),
    );
}

// Owns drawing tools, their settings, and dispatch of viewer input.
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
    const settings = createToolSettings();
    const tools = buildTools({
        surface,
        renderer,
        sampler,
        commitAnnotation,
        reportStatus: session.reportStatus,
        getOption: name => settings.getOption(name),
    });

    // Single sync point for the active-tool attribute; settings is the
    // source of truth and the DOM merely reflects it.
    settings.subscribe(state => {
        viewerElement.dataset.tool = state.tool;
    });
    viewerElement.dataset.tool = settings.getState().tool;

    function activeToolHandler(name, event) {
        if (!session.isImageReady()) return;
        const activeTool = settings.getState().tool;
        if (!tools[activeTool] || !renderer.canRender(activeTool)) return;
        tools[activeTool][name]?.(event);
    }

    for (const [viewerEvent, toolEvent] of VIEWER_EVENT_MAP) {
        viewer.addHandler(viewerEvent, event => activeToolHandler(toolEvent, event));
    }

    const pointerTracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: event => activeToolHandler("pointerMove", event),
    });
    pointerTracker.setTracking(true);

    document.addEventListener("keydown", event =>
        activeToolHandler("keyDown", event)
    );

    function cancelDrawing() {
        tools[settings.getState().tool]?.deactivate?.();
    }

    // Accepts one selection object matching the toolbar payload shape, so
    // the bridge forwards messages without positional mapping and new
    // options need no signature changes.
    function selectTool(selection = {}) {
        const nextTool = selection?.tool ?? settings.getState().tool;
        if (nextTool !== settings.getState().tool && isKnownToolId(nextTool)) {
            cancelDrawing();
        }
        return settings.select(selection);
    }

    return {selectTool, cancelDrawing, settings};
}
