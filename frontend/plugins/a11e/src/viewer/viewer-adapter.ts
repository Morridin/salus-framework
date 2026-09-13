import type { BrowserEnvironment } from "../shared/environment.js";
import type { ViewerSession } from "./viewer-session.js";
import type { PixelPoint } from "./types.js";
import type { Bounds } from "../shared/types.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function createViewerAdapter({
    env,
    session,
}: {
    env: Pick<BrowserEnvironment, "document" | "OpenSeadragon">;
    session: Pick<ViewerSession, "viewer">;
}) {
    const { viewer } = session;
    const { document } = env;

    function toImagePoint(position: PixelPoint) {
        const viewportPoint = viewer.viewport.pointFromPixel(new env.OpenSeadragon.Point(position.x, position.y));

        return viewer.viewport.viewportToImageCoordinates(viewportPoint);
    }

    function imageRectangle(bounds: Bounds) {
        return viewer.viewport.imageToViewportRectangle(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    function addOverlay(element: HTMLElement | SVGElement, bounds: Bounds) {
        viewer.addOverlay({
            element,
            location: imageRectangle(bounds),
        });
    }

    function updateOverlay(element: HTMLElement | SVGElement, bounds: Bounds) {
        viewer.updateOverlay(element, imageRectangle(bounds));
    }

    function createSvgLayer(className: string) {
        const size = viewer.world.getItemAt(0).getContentSize();
        const layer = document.createElementNS(SVG_NAMESPACE, "svg");

        layer.classList.add(className);
        layer.setAttribute("viewBox", `0 0 ${size.x} ${size.y}`);
        layer.setAttribute("aria-hidden", "true");
        addOverlay(layer, { x: 0, y: 0, width: size.x, height: size.y });

        return layer;
    }

    return {
        toImagePoint,
        createElement: (tagName: string) => document.createElement(tagName),
        createSvgElement: (tagName: string) => document.createElementNS(SVG_NAMESPACE, tagName),
        createSvgLayer,
        addOverlay,
        updateOverlay,
        removeOverlay: (element: HTMLElement | SVGElement) => viewer.removeOverlay(element),
    };
}
