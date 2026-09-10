import type { Point, Bounds } from "../shared/types.js";
import type { ViewerToolEvent } from "../tools/core/types.js";

/** The OpenSeadragon API used by this plugin, including its image tile source. */
export interface ImageTileSource {
    type: "image";
    url: string;
    buildPyramid: boolean;
}

export interface ViewerEvent extends ViewerToolEvent {
    message?: string;
}

export type ViewerEventName =
    "open" | "open-failed" | "canvas-press" | "canvas-drag" | "canvas-release" | "canvas-click";

export interface Viewer {
    canvas: HTMLElement;
    addHandler(name: ViewerEventName, handler: (event: ViewerEvent) => void): void;
    addOverlay(overlay: { element: HTMLElement | SVGElement; location: Bounds }): void;
    updateOverlay(element: HTMLElement | SVGElement, location: Bounds): void;
    removeOverlay(element: HTMLElement | SVGElement): void;
    clearOverlays(): void;
    open(source: ImageTileSource): void;
    viewport: {
        pointFromPixel(position: Point): Point;
        viewportToImageCoordinates(point: Point): Point;
        imageToViewportRectangle(x: number, y: number, width: number, height: number): Bounds;
    };
    world: { getItemAt(index: number): { getContentSize(): Point } };
}

export interface MouseTrackerOptions {
    element: HTMLElement;
    moveHandler(event: ViewerToolEvent): void;
}

export interface OpenSeadragonApi {
    (options: {
        id: string;
        prefixUrl: string;
        tileSources: ImageTileSource;
        animationTime: number;
        showNavigator: boolean;
    }): Viewer;
    MouseTracker: new (options: MouseTrackerOptions) => { setTracking(enabled: boolean): void };
    Point: new (x: number, y: number) => Point;
}
