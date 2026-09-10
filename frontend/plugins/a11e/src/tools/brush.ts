import type { AnnotationElement, BrushContext } from "./core/types.js";
import type { Stroke } from "./stroke-tool.js";
import { createStrokeTool } from "./stroke-tool.js";
import { SHAPES } from "./core/registry.js";

export function createBrushTool<E extends AnnotationElement>({
    surface,
    renderer,
    brushSettings,
    commitAnnotation,
}: BrushContext<E>) {
    return createStrokeTool<Stroke<E> & { radius: number }, E>({
        surface,
        renderer,
        commitAnnotation,
        beginStroke() {
            const radius = brushSettings.brushRadius;
            const element = renderer.render({ shape: SHAPES.BRUSH, radius, points: [] }, { preview: true });

            return { radius, points: [], element };
        },
        onPoint(stroke) {
            renderer.update(stroke.element, {
                shape: SHAPES.BRUSH,
                radius: stroke.radius,
                points: stroke.points,
            });
        },
        buildAnnotation(stroke) {
            return {
                shape: SHAPES.BRUSH,
                radius: stroke.radius,
                points: stroke.points.map(({ x, y }) => ({ x, y })),
            };
        },
    });
}
