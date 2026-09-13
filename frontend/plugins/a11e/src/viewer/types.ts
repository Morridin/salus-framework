import type { Point } from "../shared/types.js";

/** Canvas pixel coordinates from viewer input events (OpenSeadragon "web" coordinates). */
export interface PixelPoint {
    x: number;
    y: number;
}

/** OpenSeadragon viewport coordinates, normalized to the viewer. */
export interface ViewportPoint {
    x: number;
    y: number;
}

export interface ViewportBounds extends ViewportPoint {
    width: number;
    height: number;
}

/** Only the event fields drawing tools consume. */
export interface ViewerToolEvent {
    position?: PixelPoint;
    originalEvent?: { button?: number };
    preventDefaultAction?: boolean;
    quick?: boolean;
    key?: string;
    preventDefault?: () => void;
}

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
    addOverlay(overlay: { element: HTMLElement | SVGElement; location: ViewportBounds }): void;
    updateOverlay(element: HTMLElement | SVGElement, location: ViewportBounds): void;
    removeOverlay(element: HTMLElement | SVGElement): void;
    clearOverlays(): void;
    open(source: ImageTileSource): void;
    viewport: {
        pointFromPixel(position: PixelPoint): ViewportPoint;
        viewportToImageCoordinates(point: ViewportPoint): Point;
        imageToViewportRectangle(x: number, y: number, width: number, height: number): ViewportBounds;
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
    Point: new (x: number, y: number) => PixelPoint;
}
