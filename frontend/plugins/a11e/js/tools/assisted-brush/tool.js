// Intensity-aware brush interaction and mask rendering.
import {pixelKeysToRuns} from "./sampler.js";

const MINIMUM_POINT_DISTANCE = 1;

function isPrimaryButton(event) {
    const button = event.originalEvent?.button;
    return button === undefined || button === 0;
}

function runsToPathData(runs) {
    return runs.map(({y, xStart, xEnd}) => (
        `M ${xStart} ${y} H ${xEnd + 1} V ${y + 1} H ${xStart} Z`
    )).join(" ");
}

export function createAssistedBrushTool({
    surface,
    sampler,
    getRadius,
    getTolerance,
    createAnnotation,
    reportStatus = () => {},
}) {
    let layer = null;
    let stroke = null;

    function sampleAt(point) {
        for (const pixel of sampler.select(
            point,
            stroke.radius,
            stroke.tolerance,
        )) {
            stroke.pixelKeys.add(`${pixel.y}:${pixel.x}`);
        }
    }

    function addPoint(position) {
        const point = surface.toImagePoint(position);
        const previous = stroke.points.at(-1);
        const distance = previous
            ? Math.hypot(point.x - previous.x, point.y - previous.y)
            : 0;
        if (previous && distance < MINIMUM_POINT_DISTANCE) return;

        stroke.points.push({x: point.x, y: point.y});
        if (!previous) {
            sampleAt(point);
        } else {
            const stepSize = Math.max(1, stroke.radius / 2);
            const steps = Math.max(1, Math.ceil(distance / stepSize));
            for (let step = 1; step <= steps; step += 1) {
                const ratio = step / steps;
                sampleAt({
                    x: previous.x + ((point.x - previous.x) * ratio),
                    y: previous.y + ((point.y - previous.y) * ratio),
                });
            }
        }

        stroke.runs = pixelKeysToRuns(stroke.pixelKeys);
        stroke.element.setAttribute("d", runsToPathData(stroke.runs));
    }

    function start(event) {
        if (!layer || !isPrimaryButton(event)) return;
        if (!sampler.ready) {
            reportStatus(
                sampler.error?.message ||
                "The smart brush is still preparing image pixels.",
            );
            return;
        }

        reportStatus("");
        event.preventDefaultAction = true;
        const element = surface.createSvgElement("path");
        element.classList.add("assisted-brush-segmentation", "preview");
        layer.append(element);

        stroke = {
            radius: getRadius(),
            tolerance: getTolerance(),
            points: [],
            pixelKeys: new Set(),
            runs: [],
            element,
        };
        addPoint(event.position);
    }

    function drag(event) {
        if (!stroke) return;
        event.preventDefaultAction = true;
        addPoint(event.position);
    }

    function finish(event) {
        if (!stroke) return;
        event.preventDefaultAction = true;
        addPoint(event.position);

        if (stroke.runs.length === 0) {
            stroke.element.remove();
            stroke = null;
            return;
        }

        const annotation = createAnnotation({
            shape: "assisted-brush",
            radius: stroke.radius,
            tolerance: stroke.tolerance,
            runs: stroke.runs,
        });
        stroke.element.classList.remove("preview");
        stroke.element.dataset.annotationId = annotation.id;
        stroke = null;
    }

    function cancel() {
        stroke?.element.remove();
        stroke = null;
    }

    function open() {
        layer = surface.createSvgLayer("assisted-brush-layer");
    }

    return {
        open,
        press: start,
        drag,
        release: finish,
        deactivate: cancel,
    };
}
