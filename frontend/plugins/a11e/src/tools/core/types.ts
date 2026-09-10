import type { Annotation, Bounds, CommittedAnnotation, Point, Shape, ToolId } from "../../shared/types.js";

export interface ToolSelection extends Partial<BrushSettings> {
    tool?: ToolId;
}

export interface BrushSettings {
    brushRadius: number;
    brushTolerance: number;
}

/** Only the event fields drawing tools consume. */
export interface ViewerToolEvent {
    position?: Point;
    originalEvent?: { button?: number };
    preventDefaultAction?: boolean;
    quick?: boolean;
    key?: string;
    preventDefault?: () => void;
}

/** The rendering operations shared by HTML and SVG annotation elements. */
export interface AnnotationElement {
    dataset: DOMStringMap;
    classList: Pick<DOMTokenList, "add" | "remove">;
    style: Pick<CSSStyleDeclaration, "setProperty">;
    setAttribute(name: string, value: string): void;
    remove(): void;
}

export interface ViewerSurface<E extends AnnotationElement = AnnotationElement> {
    toImagePoint(position: Point): Point;
    createElement(tagName: string): E;
    createSvgElement(tagName: string): E;
    createSvgLayer(className: string): { append(element: E): void };
    addOverlay(element: E, bounds: Bounds): void;
    updateOverlay(element: E, bounds: Bounds): void;
    removeOverlay(element: E): void;
}

export interface AnnotationRenderer<E extends AnnotationElement = AnnotationElement> {
    canRender(shape: Shape): boolean;
    render(annotation: Annotation, options?: { preview?: boolean }): E;
    update(element: E, annotation: Annotation): void;
    remove(element: E): void;
}

export interface IntensitySampler {
    readonly ready: boolean;
    readonly error: Error | null;
    select(center: Point, radius: number, tolerance: number): Point[];
    setImage(url: string): void;
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

export interface ToolContext<E extends AnnotationElement = AnnotationElement> {
    surface: ViewerSurface<E>;
    renderer: AnnotationRenderer<E>;
    commitAnnotation(this: void, annotation: Annotation, preview?: E | null): CommittedAnnotation;
}

export interface BrushContext<E extends AnnotationElement = AnnotationElement> extends ToolContext<E> {
    brushSettings: Readonly<BrushSettings>;
}

export interface AssistedBrushContext<E extends AnnotationElement = AnnotationElement> extends BrushContext<E> {
    sampler: Pick<IntensitySampler, "ready" | "error" | "select">;
    reportStatus?: (message: string) => void;
}
