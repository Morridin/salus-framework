// Intensity-aware brush interaction and mask rendering.
import {pixelKeysToRuns} from "./sampler.js";
import {createStrokeTool} from "../stroke-tool.js";
import {SHAPES} from "../core/registry.js";

export function createAssistedBrushTool({
    surface,
    renderer,
    sampler,
    brushSettings,
    commitAnnotation,
    reportStatus = () => {},
}) {
    function sampleAt(stroke, point) {
        for (const pixel of sampler.select(
            point,
            stroke.radius,
            stroke.tolerance,
        )) {
            stroke.pixelKeys.add(`${pixel.y}:${pixel.x}`);
        }
    }

    function extendStroke(stroke, point, previous) {
        if (!previous) {
            sampleAt(stroke, point);
        } else {
            const distance = Math.hypot(
                point.x - previous.x,
                point.y - previous.y,
            );
            const stepSize = Math.max(1, stroke.radius / 2);
            const steps = Math.max(1, Math.ceil(distance / stepSize));
            for (let step = 1; step <= steps; step += 1) {
                const ratio = step / steps;
                sampleAt(stroke, {
                    x: previous.x + ((point.x - previous.x) * ratio),
                    y: previous.y + ((point.y - previous.y) * ratio),
                });
            }
        }

        stroke.runs = pixelKeysToRuns(stroke.pixelKeys);
        renderer.update(stroke.element, {
            shape: SHAPES.ASSISTED_BRUSH,
            runs: stroke.runs,
        });
    }

    return createStrokeTool({
        surface,
        renderer,
        commitAnnotation,
        beginStroke() {
            if (!sampler.ready) {
                reportStatus(
                    sampler.error?.message ||
                    "The smart brush is still preparing image pixels.",
                );
                return null;
            }

            reportStatus("");
            const element = renderer.render(
                {shape: SHAPES.ASSISTED_BRUSH, runs: []},
                {preview: true},
            );
            return {
                radius: brushSettings.brushRadius,
                tolerance: brushSettings.brushTolerance,
                points: [],
                pixelKeys: new Set(),
                runs: [],
                element,
            };
        },
        onPoint: extendStroke,
        buildAnnotation(stroke) {
            if (stroke.runs.length === 0) return null;
            return {
                shape: SHAPES.ASSISTED_BRUSH,
                radius: stroke.radius,
                tolerance: stroke.tolerance,
                runs: stroke.runs,
            };
        },
    });
}
