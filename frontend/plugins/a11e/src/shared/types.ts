/** Image coordinates, independent of the viewer's zoom and pan. */
export interface Point {
    x: number;
    y: number;
}

export interface Bounds extends Point {
    width: number;
    height: number;
}

/** Inclusive horizontal run of selected pixels. */
export interface Run {
    y: number;
    xStart: number;
    xEnd: number;
}

export interface AnnotationCategory {
    id: string;
    name: string;
    color: string;
}

interface AnnotationAppearance {
    category?: AnnotationCategory;
    id?: string;
    name?: string;
    color?: string;
}

export interface RectangleAnnotation extends AnnotationAppearance, Bounds {
    shape: "rectangle";
}

export interface CircleAnnotation extends AnnotationAppearance {
    shape: "circle";
    centerX: number;
    centerY: number;
    radius: number;
}

export interface PolygonAnnotation extends AnnotationAppearance {
    shape: "polygon";
    points: Point[];
}

export interface BrushAnnotation extends AnnotationAppearance {
    shape: "brush";
    points: Point[];
    radius: number;
}

export interface AssistedBrushAnnotation extends AnnotationAppearance {
    shape: "assisted-brush";
    runs: Run[];
    radius?: number;
    tolerance?: number;
}

export type Annotation =
    RectangleAnnotation | CircleAnnotation | PolygonAnnotation | BrushAnnotation | AssistedBrushAnnotation;

/** Bounding-box annotations: rectangle and circle. */
export type OverlayAnnotation = Extract<Annotation, { shape: "rectangle" | "circle" }>;

export type CommittedAnnotation = Annotation & { id: string };

/** Lightweight committed display data for lists and editors. */
export interface AnnotationSummary {
    category?: AnnotationCategory;
    id: string;
    name?: string;
    color?: string;
    shape: Shape;
}

export interface AnnotationChanges {
    category?: AnnotationCategory | null;
    name?: string;
    color?: string;
}

export type Shape = Annotation["shape"];

export type ToolId = Shape | "none";

/** Annotation shape identifiers, shared by drawing, rendering, and messaging. */
export const SHAPES = {
    RECTANGLE: "rectangle",
    CIRCLE: "circle",
    POLYGON: "polygon",
    BRUSH: "brush",
    ASSISTED_BRUSH: "assisted-brush",
} as const satisfies Record<string, Shape>;
