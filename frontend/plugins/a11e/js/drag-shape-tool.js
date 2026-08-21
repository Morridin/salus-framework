const MINIMUM_SHAPE_SIZE = 3;

function shapeBounds(tool, start, end) {
    if (tool === "circle") {
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

    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.max(Math.abs(end.x - start.x), 1),
        height: Math.max(Math.abs(end.y - start.y), 1),
    };
}

export function createDragShapeTool({
    surface,
    tool,
    createAnnotation,
}) {
    let drawing = null;

    function updateDrawing(position) {
        drawing.end = surface.toImagePoint(position);
        drawing.bounds = shapeBounds(drawing.tool, drawing.start, drawing.end);
        surface.updateOverlay(drawing.element, drawing.bounds);
    }

    function startDrawing(event) {
        event.preventDefaultAction = true;

        const start = surface.toImagePoint(event.position);
        const element = surface.createElement("div");
        element.className = `segmentation-overlay preview ${tool}`;

        drawing = {
            tool,
            start,
            end: start,
            element,
            bounds: shapeBounds(tool, start, start),
        };

        surface.addOverlay(element, drawing.bounds);
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
            surface.removeOverlay(drawing.element);
            drawing = null;
            return;
        }

        const annotationData = drawing.tool === "circle"
            ? {
                shape: drawing.tool,
                centerX: drawing.bounds.centerX,
                centerY: drawing.bounds.centerY,
                radius: drawing.bounds.radius,
            }
            : {
                shape: drawing.tool,
                x: drawing.bounds.x,
                y: drawing.bounds.y,
                width: drawing.bounds.width,
                height: drawing.bounds.height,
            };
        const annotation = createAnnotation(annotationData);

        drawing.element.classList.remove("preview");
        drawing.element.dataset.annotationId = annotation.id;
        drawing = null;
    }

    function deactivate() {
        if (!drawing) return;

        surface.removeOverlay(drawing.element);
        drawing = null;
    }

    return {
        press: startDrawing,
        drag: dragDrawing,
        release: finishDrawing,
        deactivate,
    };
}
