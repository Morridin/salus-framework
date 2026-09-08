const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function createViewerAdapter({viewer, document}) {
    function toImagePoint(position) {
        const viewportPoint = viewer.viewport.pointFromPixel(position);
        return viewer.viewport.viewportToImageCoordinates(viewportPoint);
    }

    function imageRectangle(bounds) {
        return viewer.viewport.imageToViewportRectangle(
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
        );
    }

    function addOverlay(element, bounds) {
        viewer.addOverlay({
            element,
            location: imageRectangle(bounds),
        });
    }

    function updateOverlay(element, bounds) {
        viewer.updateOverlay(element, imageRectangle(bounds));
    }

    function createSvgLayer(className) {
        const size = viewer.world.getItemAt(0).getContentSize();
        const layer = document.createElementNS(SVG_NAMESPACE, "svg");
        layer.classList.add(className);
        layer.setAttribute("viewBox", `0 0 ${size.x} ${size.y}`);
        layer.setAttribute("aria-hidden", "true");
        addOverlay(layer, {x: 0, y: 0, width: size.x, height: size.y});
        return layer;
    }

    return {
        toImagePoint,
        createElement: tagName => document.createElement(tagName),
        createSvgElement: tagName =>
            document.createElementNS(SVG_NAMESPACE, tagName),
        createSvgLayer,
        addOverlay,
        updateOverlay,
        removeOverlay: element => viewer.removeOverlay(element),
    };
}
