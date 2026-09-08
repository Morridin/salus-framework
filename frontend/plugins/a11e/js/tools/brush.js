import {createStrokeTool} from "./stroke-tool.js";
import {SHAPES} from "./core/registry.js";

export function createBrushTool({
    surface,
    renderer,
    brushSettings,
    commitAnnotation,
}) {
    return createStrokeTool({
        surface,
        renderer,
        commitAnnotation,
        beginStroke() {
            const radius = brushSettings.brushRadius;
            const element = renderer.render(
                {shape: SHAPES.BRUSH, radius, points: []},
                {preview: true},
            );
            return {radius, points: [], element};
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
                points: stroke.points.map(({x, y}) => ({x, y})),
            };
        },
    });
}
