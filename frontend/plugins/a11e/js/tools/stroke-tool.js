// Shared press-drag-release lifecycle for continuous stroke tools
// (brush, assisted-brush). The generic owns coordinate conversion,
// distance throttling, and preview/commit/cancel wiring; each tool
// supplies how a stroke starts, how an accepted point extends it,
// and what annotation to commit.
import {MINIMUM_POINT_DISTANCE} from "../shared/annotation-constants.js";

export function isPrimaryButton(event) {
    const button = event.originalEvent?.button;
    return button === undefined || button === 0;
}

export function createStrokeTool({
    surface,
    renderer,
    commitAnnotation,
    minimumDistance = MINIMUM_POINT_DISTANCE,
    beginStroke,
    onPoint,
    buildAnnotation,
}) {
    let stroke = null;

    function addPoint(position) {
        const imagePoint = surface.toImagePoint(position);
        const point = {x: imagePoint.x, y: imagePoint.y};
        const previous = stroke.points.at(-1) ?? null;
        if (
            previous &&
            Math.hypot(point.x - previous.x, point.y - previous.y) <
                minimumDistance
        ) {
            return;
        }
        stroke.points.push(point);
        onPoint(stroke, point, previous);
    }

    function start(event) {
        if (!isPrimaryButton(event)) return;
        const next = beginStroke(event);
        if (!next) return;
        event.preventDefaultAction = true;
        stroke = next;
        addPoint(event.position);
    }

    function drag(event) {
        if (!stroke) return;
        event.preventDefaultAction = true;
        addPoint(event.position);
    }

    function finish(event) {
        if (!stroke) return;
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
        if (stroke) renderer.remove(stroke.element);
        stroke = null;
    }

    return {
        press: start,
        drag,
        release: finish,
        deactivate: cancel,
    };
}
