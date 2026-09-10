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

interface AnnotationAppearance {
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

export type AnnotationChanges = { name?: unknown; color?: unknown };

export type Shape = Annotation["shape"];

export type ToolId = Shape | "none";
