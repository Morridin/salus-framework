// Shared drag behavior for rectangles and circles.
import {MINIMUM_SHAPE_SIZE} from "../shared/annotation-constants.js";
import {SHAPES} from "./core/registry.js";
import {defineTool} from "./core/base.js";

function rectangleBounds(start, end) {
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.max(Math.abs(end.x - start.x), 1),
        height: Math.max(Math.abs(end.y - start.y), 1),
    };
}

function circleBounds(start, end) {
    const radius = Math.max(
        Math.hypot(end.x - start.x, end.y - start.y),
        0.5,
    );

    return {
        x: start.x - radius,
        y: start.y - radius,
        width: radius * 2,
        height: radius * 2,
        centerX: start.x,
        centerY: start.y,
        radius,
    };
}

function rectangleAnnotation(tool, bounds) {
    return {
        shape: tool,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
    };
}

function circleAnnotation(tool, bounds) {
    return {
        shape: tool,
        centerX: bounds.centerX,
        centerY: bounds.centerY,
        radius: bounds.radius,
    };
}

// Per-shape geometry: the lifecycle below is shape-agnostic, so adding a
// drag-based shape only needs one entry here.
const DRAG_SHAPE_CONFIGS = {
    [SHAPES.RECTANGLE]: {toBounds: rectangleBounds, toAnnotation: rectangleAnnotation},
    [SHAPES.CIRCLE]: {toBounds: circleBounds, toAnnotation: circleAnnotation},
};

export function createDragShapeTool({
    surface,
    renderer,
    tool,
    commitAnnotation,
}) {
    let drawing = null;
    const config = DRAG_SHAPE_CONFIGS[tool] ?? DRAG_SHAPE_CONFIGS[SHAPES.RECTANGLE];

    function updateDrawing(position) {
        drawing.end = surface.toImagePoint(position);
        drawing.bounds = config.toBounds(drawing.start, drawing.end);
        renderer.update(drawing.element, {
            shape: drawing.tool,
            ...drawing.bounds,
        });
    }

    function startDrawing(event) {
        event.preventDefaultAction = true;

        const start = surface.toImagePoint(event.position);
        const bounds = config.toBounds(start, start);
        const element = renderer.render(
            {shape: tool, ...bounds},
            {preview: true},
        );

        drawing = {
            tool,
            start,
            end: start,
            element,
            bounds,
        };
    }

    function dragDrawing(event) {
        if (!drawing) return;

        event.preventDefaultAction = true;
        updateDrawing(event.position);
    }

    function finishDrawing(event) {
        if (!drawing) return;

        event.preventDefaultAction = true;
        updateDrawing(event.position);

        if (
            drawing.bounds.width < MINIMUM_SHAPE_SIZE ||
            drawing.bounds.height < MINIMUM_SHAPE_SIZE
        ) {
            renderer.remove(drawing.element);
            drawing = null;
            return;
        }

        const annotationData = config.toAnnotation(drawing.tool, drawing.bounds);
        commitAnnotation(annotationData, drawing.element);
        drawing = null;
    }

    function deactivate() {
        if (!drawing) return;

        renderer.remove(drawing.element);
        drawing = null;
    }

    return defineTool({
        press: startDrawing,
        drag: dragDrawing,
        release: finishDrawing,
        deactivate,
    });
}
