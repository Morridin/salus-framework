// Click-to-place polygon tool.
function pointString(points) {
    return points.map(point => `${point.x},${point.y}`).join(" ");
}

export function createPolygonTool({
    surface,
    createAnnotation,
}) {
    let draft = null;
    let layer = null;

    function renderDraft(cursorPoint = null) {
        if (!draft) return;

        const displayedPoints = cursorPoint
            ? [...draft.points, cursorPoint]
            : draft.points;
        draft.element.setAttribute(
            "points",
            pointString(displayedPoints),
        );
    }

    function start(point) {
        const element = surface.createSvgElement("polygon");
        element.classList.add("polygon-segmentation", "preview");
        layer.append(element);

        draft = {points: [point], element};
        renderDraft();
    }

    function addPoint(event) {
        if (!layer || event.quick === false) return;

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
        draft?.element.remove();
        draft = null;
    }

    function finish() {
        if (!draft) return;

        if (draft.points.length < 3) {
            cancel();
            return;
        }

        const annotation = createAnnotation({
            shape: "polygon",
            points: draft.points.map(({x, y}) => ({x, y})),
        });

        renderDraft();
        draft.element.classList.remove("preview");
        draft.element.dataset.annotationId = annotation.id;
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

    function open() {
        layer = surface.createSvgLayer("polygon-layer");
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

    return {
        open,
        click: addPoint,
        pointerMove: previewEdge,
        keyDown,
        deactivate: cancel,
    };
}
