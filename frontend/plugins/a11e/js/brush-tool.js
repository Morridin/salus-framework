const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const MINIMUM_POINT_DISTANCE = 1;

function imagePoint(viewer, position) {
    const viewportPoint = viewer.viewport.pointFromPixel(position);
    return viewer.viewport.viewportToImageCoordinates(viewportPoint);
}

function pathData(points) {
    if (points.length === 1) {
        const {x, y} = points[0];
        return `M ${x} ${y} l 0.001 0`;
    }

    return points
        .map(({x, y}, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
        .join(" ");
}

function isPrimaryButton(event) {
    const button = event.originalEvent?.button;
    return button === undefined || button === 0;
}

export function createBrushTool({
    viewer,
    document,
    isActive,
    getRadius,
    createAnnotation,
}) {
    let layer = null;
    let stroke = null;

    function render() {
        stroke.element.setAttribute("d", pathData(stroke.points));
    }

    function addPoint(position) {
        const point = imagePoint(viewer, position);
        const previous = stroke.points.at(-1);

        if (
            previous &&
            Math.hypot(point.x - previous.x, point.y - previous.y) <
                MINIMUM_POINT_DISTANCE
        ) {
            return;
        }

        stroke.points.push({x: point.x, y: point.y});
        render();
    }

    function start(event) {
        if (!isActive() || !layer || !isPrimaryButton(event)) return;

        event.preventDefaultAction = true;

        const radius = getRadius();
        const element = document.createElementNS(SVG_NAMESPACE, "path");
        element.classList.add("brush-segmentation", "preview");
        element.setAttribute("stroke-width", radius * 2);
        layer.append(element);

        stroke = {radius, points: [], element};
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

        const annotation = createAnnotation({
            shape: "brush",
            radius: stroke.radius,
            points: stroke.points.map(({x, y}) => ({x, y})),
        });

        stroke.element.classList.remove("preview");
        stroke.element.dataset.annotationId = annotation.id;
        stroke = null;
    }

    function cancel() {
        stroke?.element.remove();
        stroke = null;
    }

    viewer.addHandler("open", () => {
        const size = viewer.world.getItemAt(0).getContentSize();
        layer = document.createElementNS(SVG_NAMESPACE, "svg");
        layer.classList.add("brush-layer");
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

    viewer.addHandler("canvas-press", start);
    viewer.addHandler("canvas-drag", drag);
    viewer.addHandler("canvas-release", finish);

    return {cancel};
}
