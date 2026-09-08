const MINIMUM_POINT_DISTANCE = 1;

function isPrimaryButton(event) {
    const button = event.originalEvent?.button;
    return button === undefined || button === 0;
}

export function createBrushTool({
    surface,
    renderer,
    getRadius,
    commitAnnotation,
}) {
    let stroke = null;

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
        renderer.update(stroke.element, {
            shape: "brush",
            radius: stroke.radius,
            points: stroke.points,
        });
    }

    function start(event) {
        if (!isPrimaryButton(event)) return;

        event.preventDefaultAction = true;

        const radius = getRadius();
        const element = renderer.render(
            {shape: "brush", radius, points: []},
            {preview: true},
        );

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

        commitAnnotation({
            shape: "brush",
            radius: stroke.radius,
            points: stroke.points.map(({x, y}) => ({x, y})),
        }, stroke.element);
        stroke = null;
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
