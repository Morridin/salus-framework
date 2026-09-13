import type { Annotation, Bounds, CommittedAnnotation, Point, Shape, ToolId } from "../../shared/types.js";
import type { PixelPoint, ViewerToolEvent } from "../../viewer/types.js";

export interface ToolSelection extends Partial<BrushSettings> {
    tool?: ToolId;
}

export interface BrushSettings {
    brushRadius: number;
    brushTolerance: number;
}

/** DOM elements used for annotation overlays and SVG drawings. */
export type RenderElement = HTMLElement | SVGElement;

export interface ViewerSurface {
    toImagePoint(position: PixelPoint): Point;
    createElement(tagName: string): HTMLElement;
    createSvgElement(tagName: string): SVGElement;
    createSvgLayer(className: string): SVGSVGElement;
    addOverlay(element: RenderElement, bounds: Bounds): void;
    updateOverlay(element: RenderElement, bounds: Bounds): void;
    removeOverlay(element: RenderElement): void;
}

export interface AnnotationRenderer {
    canRender(shape: Shape): boolean;
    render(annotation: Annotation, options?: { preview?: boolean }): RenderElement;
    update(element: RenderElement, annotation: Annotation): void;
    remove(element: RenderElement): void;
}

export interface IntensitySampler {
    readonly ready: boolean;
    readonly error: Error | null;
    select(center: Point, radius: number, tolerance: number): Point[];
    setImage(url: string): void;
    dispose(): void;
}

export interface Tool {
    press?(event: ViewerToolEvent): void;
    drag?(event: ViewerToolEvent): void;
    release?(event: ViewerToolEvent): void;
    click?(event: ViewerToolEvent): void;
    pointerMove?(event: ViewerToolEvent): void;
    keyDown?(event: ViewerToolEvent): void;
    deactivate?(): void;
}

export interface ToolContext {
    surface: ViewerSurface;
    renderer: AnnotationRenderer;
    commitAnnotation(this: void, annotation: Annotation, preview?: RenderElement | null): CommittedAnnotation;
}

export interface BrushContext extends ToolContext {
    brushSettings: Readonly<BrushSettings>;
}

export interface AssistedBrushContext extends BrushContext {
    sampler: Pick<IntensitySampler, "ready" | "error" | "select">;
    reportStatus?: (message: string) => void;
}
