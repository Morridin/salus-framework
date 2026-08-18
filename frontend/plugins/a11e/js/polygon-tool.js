const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function imagePoint(viewer, position) {
    const viewportPoint = viewer.viewport.pointFromPixel(position);
    return viewer.viewport.viewportToImageCoordinates(viewportPoint);
}

function pointString(points) {
    return points.map(point => `${point.x},${point.y}`).join(" ");
}

export function createPolygonTool({
    viewer,
    document,
    OpenSeadragon,
    isActive,
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
        const element = document.createElementNS(SVG_NAMESPACE, "polygon");
        element.classList.add("polygon-segmentation", "preview");
        layer.append(element);

        draft = {points: [point], element};
        renderDraft();
    }

    function addPoint(event) {
        if (!isActive() || !layer || event.quick === false) return;

        event.preventDefaultAction = true;
        const point = imagePoint(viewer, event.position);

        if (draft) {
            draft.points.push(point);
            renderDraft();
        } else {
            start(point);
        }
    }

    function previewEdge(event) {
        if (!isActive() || !draft) return;
        renderDraft(imagePoint(viewer, event.position));
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

    viewer.addHandler("open", () => {
        const size = viewer.world.getItemAt(0).getContentSize();
        layer = document.createElementNS(SVG_NAMESPACE, "svg");
        layer.classList.add("polygon-layer");
        layer.setAttribute("viewBox", `0 0 ${size.x} ${size.y}`);
        layer.setAttribute("aria-hidden", "true");

        viewer.addOverlay({
            element: layer,
            location: viewer.viewport.imageToViewportRectangle(
                0,
                0,
                size.x,
                size.y,
            ),
        });
    });
    viewer.addHandler("canvas-click", addPoint);

    const pointerTracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: previewEdge,
    });
    pointerTracker.setTracking(true);

    document.addEventListener("keydown", event => {
        if (!isActive()) return;

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
    });

    return {cancel};
}
