const MINIMUM_POINT_DISTANCE = 1;

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
    surface,
    getRadius,
    createAnnotation,
}) {
    let layer = null;
    let stroke = null;

    function render() {
        stroke.element.setAttribute("d", pathData(stroke.points));
    }

    function addPoint(position) {
        const point = surface.toImagePoint(position);
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
        if (!layer || !isPrimaryButton(event)) return;

        event.preventDefaultAction = true;

        const radius = getRadius();
        const element = surface.createSvgElement("path");
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

    function open() {
        layer = surface.createSvgLayer("brush-layer");
    }

    return {
        open,
        press: start,
        drag,
        release: finish,
        deactivate: cancel,
    };
}
