import {SHAPES} from "./core/registry.js";
import {defineTool} from "./core/base.js";

export function createPolygonTool({
    surface,
    renderer,
    commitAnnotation,
}) {
    let draft = null;

    function renderDraft(cursorPoint = null) {
        if (!draft) return;

        const displayedPoints = cursorPoint
            ? [...draft.points, cursorPoint]
            : draft.points;
        renderer.update(draft.element, {
            shape: SHAPES.POLYGON,
            points: displayedPoints,
        });
    }

    function start(point) {
        const element = renderer.render(
            {shape: SHAPES.POLYGON, points: [point]},
            {preview: true},
        );

        draft = {points: [point], element};
        renderDraft();
    }

    function addPoint(event) {
        if (event.quick === false) return;

        event.preventDefaultAction = true;
        const point = surface.toImagePoint(event.position);

        if (draft) {
            draft.points.push(point);
            renderDraft();
        } else {
            start(point);
        }
    }

    function previewEdge(event) {
        if (!draft) return;
        renderDraft(surface.toImagePoint(event.position));
    }

    function cancel() {
        if (draft) renderer.remove(draft.element);
        draft = null;
    }

    function finish() {
        if (!draft) return;

        if (draft.points.length < 3) {
            cancel();
            return;
        }

        commitAnnotation({
            shape: SHAPES.POLYGON,
            points: draft.points.map(({x, y}) => ({x, y})),
        }, draft.element);
        draft = null;
    }

    function removeLastPoint() {
        if (!draft) return;

        draft.points.pop();
        if (draft.points.length === 0) {
            cancel();
        } else {
            renderDraft();
        }
    }

    function keyDown(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            finish();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
        } else if (event.key === "Backspace" && draft) {
            event.preventDefault();
            removeLastPoint();
        }
    }

    return defineTool({
        click: addPoint,
        pointerMove: previewEdge,
        keyDown,
        deactivate: cancel,
    });
}
