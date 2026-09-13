import type { Annotation, CommittedAnnotation, Point, ToolId } from "../../shared/types.js";
import type { ViewerToolEvent } from "../../viewer/types.js";
import type { AnnotationRenderer, RenderElement, ViewerSurface } from "../../annotations/renderer.js";

export interface ToolSelection extends Partial<BrushSettings> {
    tool?: ToolId;
}

export interface BrushSettings {
    brushRadius: number;
    brushTolerance: number;
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
