import {createStrokeTool} from "./stroke-tool.js";
import {SHAPES, TOOL_OPTIONS} from "./core/registry.js";

export function createBrushTool({
    surface,
    renderer,
    getOption,
    commitAnnotation,
}) {
    return createStrokeTool({
        surface,
        renderer,
        commitAnnotation,
        beginStroke() {
            const radius = getOption(TOOL_OPTIONS.BRUSH_RADIUS);
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
