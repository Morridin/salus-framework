import type { Point, Annotation } from "../shared/types.js";
import type { ToolContext } from "./core/types.js";
import type { RenderElement } from "../annotations/renderer.js";
import type { ViewerToolEvent } from "../viewer/types.js";
import { MINIMUM_POINT_DISTANCE } from "../shared/annotation-constants.js";

// Shared press-drag-release lifecycle for continuous stroke tools
// (brush, assisted-brush). The generic owns coordinate conversion,
// distance throttling, and preview/commit/cancel wiring; each tool
// supplies how a stroke starts, how an accepted point extends it,
// and what annotation to commit.
export interface Stroke {
    points: Point[];
    element: RenderElement;
}

interface StrokeOptions<S extends Stroke> extends ToolContext {
    minimumDistance?: number;
    beginStroke(this: void, event: ViewerToolEvent): S | null;
    onPoint(this: void, stroke: S, point: Point, previous: Point | null): void;
    buildAnnotation(this: void, stroke: S): Annotation | null;
}

export function isPrimaryButton(event: ViewerToolEvent) {
    const button = event.originalEvent?.button;

    return button === undefined || button === 0;
}

export function createStrokeTool<S extends Stroke>({
    surface,
    renderer,
    commitAnnotation,
    minimumDistance = MINIMUM_POINT_DISTANCE,
    beginStroke,
    onPoint,
    buildAnnotation,
}: StrokeOptions<S>) {
    let stroke: S | null = null;

    function addPoint(position: Point | undefined) {
        if (!stroke || !position) {
            return;
        }

        const imagePoint = surface.toImagePoint(position);
        const point = { x: imagePoint.x, y: imagePoint.y };
        const previous = stroke.points.at(-1) ?? null;

        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < minimumDistance) {
            return;
        }

        stroke.points.push(point);
        onPoint(stroke, point, previous);
    }

    function start(event: ViewerToolEvent) {
        if (!isPrimaryButton(event) || !event.position) {
            return;
        }

        const next = beginStroke(event);

        if (!next) {
            return;
        }

        event.preventDefaultAction = true;
        stroke = next;
        addPoint(event.position);
    }

    function drag(event: ViewerToolEvent) {
        if (!stroke) {
            return;
        }

        event.preventDefaultAction = true;
        addPoint(event.position);
    }

    function finish(event: ViewerToolEvent) {
        if (!stroke) {
            return;
        }

        event.preventDefaultAction = true;
        addPoint(event.position);

        const element = stroke.element;
        const annotationData = buildAnnotation(stroke);

        stroke = null;

        if (!annotationData) {
            renderer.remove(element);

            return;
        }

        commitAnnotation(annotationData, element);
    }

    function cancel() {
        if (stroke) {
            renderer.remove(stroke.element);
        }

        stroke = null;
    }

    return {
        press: start,
        drag,
        release: finish,
        deactivate: cancel,
    };
}
