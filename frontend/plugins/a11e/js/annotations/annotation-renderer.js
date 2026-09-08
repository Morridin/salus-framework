import {annotationColor} from "./annotation-appearance.js";
import {ANNOTATION_FILL_OPACITY} from "../constants.js";

function rectangleBounds({x, y, width, height}) {
    return {x, y, width, height};
}

function circleBounds({centerX, centerY, radius}) {
    return {
        x: centerX - radius,
        y: centerY - radius,
        width: radius * 2,
        height: radius * 2,
    };
}

function pointString(points) {
    return points.map(point => `${point.x},${point.y}`).join(" ");
}

function brushPathData(points) {
    if (points.length === 1) {
        const {x, y} = points[0];
        return `M ${x} ${y} l 0.001 0`;
    }

    return points
        .map(({x, y}, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
        .join(" ");
}

function assistedBrushPathData(runs) {
    return runs.map(({y, xStart, xEnd}) => (
        `M ${xStart} ${y} H ${xEnd + 1} V ${y + 1} H ${xStart} Z`
    )).join(" ");
}

function addPreviewClass(element, preview) {
    if (preview) element.classList.add("preview");
}

function setAnnotationId(element, id) {
    if (id) element.dataset.annotationId = id;
}

export function createAnnotationRenderer({surface}) {
    let layers = null;
    const committedElements = new Map();
    let selectedId = null;

    function setSelected(id) {
        committedElements.get(selectedId)?.classList.remove("selected");
        selectedId = id;
        committedElements.get(selectedId)?.classList.add("selected");
    }

    function updateAppearance(annotation) {
        const element = committedElements.get(annotation.id);
        if (!element) return;
        const color = annotationColor(annotation);
        const opacity = ANNOTATION_FILL_OPACITY[annotation.shape] ??
            ANNOTATION_FILL_OPACITY.default;
        element.style.setProperty("--annotation-color", color);
        element.style.setProperty("--annotation-fill", `${color}${opacity}`);
    }

    function register(element, annotation) {
        setAnnotationId(element, annotation.id);
        if (annotation.id) {
            committedElements.set(annotation.id, element);
            updateAppearance(annotation);
            if (annotation.id === selectedId) element.classList.add("selected");
        }
    }
    const overlayElements = new WeakSet();

    function initializeLayers() {
        layers = {
            polygon: surface.createSvgLayer("polygon-layer"),
            brush: surface.createSvgLayer("brush-layer"),
            "assisted-brush": surface.createSvgLayer("assisted-brush-layer"),
        };
    }

    function isReady() {
        return layers !== null;
    }

    function alwaysReady() {
        return true;
    }

    function svgLayer(shape) {
        if (!layers) {
            throw new Error("Annotation renderer layers are not initialized.");
        }
        return layers[shape];
    }

    function updateOverlay(element, annotation) {
        const bounds = shapeDefinition(annotation.shape).bounds(annotation);
        surface.updateOverlay(element, bounds);
    }

    function updatePolygon(element, annotation) {
        element.setAttribute("points", pointString(annotation.points));
    }

    function updateBrush(element, annotation) {
        element.setAttribute("d", brushPathData(annotation.points));
        element.setAttribute("stroke-width", annotation.radius * 2);
    }

    function updateAssistedBrush(element, annotation) {
        element.setAttribute("d", assistedBrushPathData(annotation.runs));
    }

    function renderOverlay(annotation, preview) {
        const element = surface.createElement("div");
        element.classList.add("segmentation-overlay", annotation.shape);
        addPreviewClass(element, preview);
        const bounds = shapeDefinition(annotation.shape).bounds(annotation);
        surface.addOverlay(element, bounds);
        overlayElements.add(element);
        return element;
    }

    function renderSvg(annotation, preview) {
        const tagName = shapeDefinition(annotation.shape).tagName;
        const element = surface.createSvgElement(tagName);
        element.classList.add(`${annotation.shape}-segmentation`);
        addPreviewClass(element, preview);
        svgLayer(annotation.shape).append(element);
        update(element, annotation);
        return element;
    }

    const shapeDefinitions = {
        rectangle: {
            bounds: rectangleBounds,
            isReady: alwaysReady,
            render: renderOverlay,
            update: updateOverlay,
        },
        circle: {
            bounds: circleBounds,
            isReady: alwaysReady,
            render: renderOverlay,
            update: updateOverlay,
        },
        polygon: {
            tagName: "polygon",
            isReady,
            render: renderSvg,
            update: updatePolygon,
        },
        brush: {
            tagName: "path",
            isReady,
            render: renderSvg,
            update: updateBrush,
        },
        "assisted-brush": {
            tagName: "path",
            isReady,
            render: renderSvg,
            update: updateAssistedBrush,
        },
    };

    function shapeDefinition(shape) {
        const definition = shapeDefinitions[shape];
        if (!definition) {
            throw new Error(`Unsupported annotation shape: ${shape}`);
        }
        return definition;
    }

    function canRender(shape) {
        return shapeDefinition(shape).isReady();
    }

    function update(element, annotation) {
        shapeDefinition(annotation.shape).update(element, annotation);
    }

    function render(annotation, options) {
        const preview = options?.preview === true;
        const element = shapeDefinition(annotation.shape).render(
            annotation,
            preview,
        );
        if (!preview) register(element, annotation);
        return element;
    }

    function finalizePreview(element, annotation) {
        update(element, annotation);
        element.classList.remove("preview");
        register(element, annotation);
    }

    function remove(element) {
        if (element.dataset.annotationId === selectedId) setSelected(null);
        committedElements.delete(element.dataset.annotationId);
        if (overlayElements.has(element)) {
            surface.removeOverlay(element);
        } else {
            element.remove();
        }
    }

    function removeAnnotation(id) {
        const element = committedElements.get(id);
        if (element) remove(element);
    }

    return {
        initializeLayers,
        canRender,
        render,
        update,
        updateAppearance,
        setSelected,
        finalizePreview,
        remove,
        removeAnnotation,
    };
}
