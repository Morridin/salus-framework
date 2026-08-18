const MINIMUM_SHAPE_SIZE = 3;

function imagePoint(viewer, position) {
    const viewportPoint = viewer.viewport.pointFromPixel(position);
    return viewer.viewport.viewportToImageCoordinates(viewportPoint);
}

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

function viewportBounds(viewer, bounds) {
    return viewer.viewport.imageToViewportRectangle(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
    );
}

export function createDragShapeTool({
    viewer,
    document,
    getActiveTool,
    createAnnotation,
}) {
    let drawing = null;

    function updateDrawing(position) {
        drawing.end = imagePoint(viewer, position);
        drawing.bounds = shapeBounds(drawing.tool, drawing.start, drawing.end);
        viewer.updateOverlay(
            drawing.element,
            viewportBounds(viewer, drawing.bounds),
        );
    }

    function startDrawing(event) {
        const activeTool = getActiveTool();
        if (!["rectangle", "circle"].includes(activeTool)) return;

        event.preventDefaultAction = true;

        const start = imagePoint(viewer, event.position);
        const element = document.createElement("div");
        element.className = `segmentation-overlay preview ${activeTool}`;

        drawing = {
            tool: activeTool,
            start,
            end: start,
            element,
            bounds: shapeBounds(activeTool, start, start),
        };

        viewer.addOverlay({
            element,
            location: viewportBounds(viewer, drawing.bounds),
        });
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
            viewer.removeOverlay(drawing.element);
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

    viewer.addHandler("canvas-press", startDrawing);
    viewer.addHandler("canvas-drag", dragDrawing);
    viewer.addHandler("canvas-release", finishDrawing);
}
