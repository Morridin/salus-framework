import { MINIMUM_SHAPE_SIZE } from "../shared/annotation-constants.js";
import type { OverlayAnnotation, Point } from "../shared/types.js";
import type { ToolContext } from "./core/types.js";
import type { RenderElement } from "../annotations/renderer.js";
import type { ViewerToolEvent } from "../viewer/types.js";

function geometry(tool: OverlayAnnotation["shape"], start: Point, end: Point): OverlayAnnotation {
    if (tool === "rectangle") {
        return {
            shape: tool,
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.max(Math.abs(end.x - start.x), 1),
            height: Math.max(Math.abs(end.y - start.y), 1),
        };
    }

    return {
        shape: tool,
        centerX: start.x,
        centerY: start.y,
        radius: Math.max(Math.hypot(end.x - start.x, end.y - start.y), 0.5),
    };
}

export function createDragShapeTool({
    surface,
    renderer,
    tool,
    commitAnnotation,
}: ToolContext & { tool: OverlayAnnotation["shape"] }) {
    let drawing: { start: Point; annotation: OverlayAnnotation; element: RenderElement } | null = null;

    function updateDrawing(position: Point | undefined) {
        if (!drawing || !position) {
            return;
        }

        drawing.annotation = geometry(tool, drawing.start, surface.toImagePoint(position));
        renderer.update(drawing.element, drawing.annotation);
    }

    function startDrawing(event: ViewerToolEvent) {
        if (!event.position) {
            return;
        }

        event.preventDefaultAction = true;

        const start = surface.toImagePoint(event.position);
        const annotation = geometry(tool, start, start);

        drawing = { start, annotation, element: renderer.render(annotation, { preview: true }) };
    }

    function dragDrawing(event: ViewerToolEvent) {
        if (!drawing) {
            return;
        }

        event.preventDefaultAction = true;
        updateDrawing(event.position);
    }

    function finishDrawing(event: ViewerToolEvent) {
        if (!drawing) {
            return;
        }

        event.preventDefaultAction = true;
        updateDrawing(event.position);

        const { annotation, element } = drawing;
        const width = annotation.shape === "circle" ? annotation.radius * 2 : annotation.width;
        const height = annotation.shape === "circle" ? annotation.radius * 2 : annotation.height;

        if (width < MINIMUM_SHAPE_SIZE || height < MINIMUM_SHAPE_SIZE) {
            renderer.remove(element);
        } else {
            commitAnnotation(annotation, element);
        }

        drawing = null;
    }

    function deactivate() {
        if (drawing) {
            renderer.remove(drawing.element);
        }

        drawing = null;
    }

    return { press: startDrawing, drag: dragDrawing, release: finishDrawing, deactivate };
}
