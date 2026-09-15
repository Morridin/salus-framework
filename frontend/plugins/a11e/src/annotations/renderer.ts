import { annotationColor } from "./appearance.js";
import { ANNOTATION_FILL_OPACITY } from "../shared/annotation-constants.js";
import type { Annotation, Bounds, OverlayAnnotation, Point, Run, Shape } from "../shared/types.js";
import type { PixelPoint } from "../viewer/types.js";

/** DOM elements used for annotation overlays and SVG drawings. */
export type RenderElement = HTMLElement | SVGElement;

export interface ViewerSurface {
    toImagePoint(position: PixelPoint): Point;
    createElement(tagName: string): HTMLElement;
    createSvgElement(tagName: string): SVGElement;
    createSvgLayer(className: string): SVGSVGElement;
    addOverlay(element: RenderElement, bounds: Bounds): void;
    updateOverlay(element: RenderElement, bounds: Bounds): void;
    removeOverlay(element: RenderElement): void;
}

export interface AnnotationRenderer {
    canRender(shape: Shape): boolean;
    render(annotation: Annotation, options?: { preview?: boolean }): RenderElement;
    update(element: RenderElement, annotation: Annotation): void;
    remove(element: RenderElement): void;
}

type SvgShape = Exclude<Shape, OverlayAnnotation["shape"]>;

function overlayBounds(annotation: OverlayAnnotation): Bounds {
    if (annotation.shape === "rectangle") {
        const { x, y, width, height } = annotation;

        return { x, y, width, height };
    }

    const { centerX, centerY, radius } = annotation;

    return { x: centerX - radius, y: centerY - radius, width: radius * 2, height: radius * 2 };
}

function brushPathData(points: Point[]): string {
    const first = points[0];

    if (points.length === 1 && first) {
        return `M ${first.x} ${first.y} l 0.001 0`;
    }

    return points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

function assistedBrushPathData(runs: Run[]): string {
    return runs.map(({ y, xStart, xEnd }) => `M ${xStart} ${y} H ${xEnd + 1} V ${y + 1} H ${xStart} Z`).join(" ");
}

export function createAnnotationRenderer({ surface }: { surface: ViewerSurface }) {
    let previewColor: string | undefined;

    function setPreviewColor(color: string | undefined) {
        previewColor = color;
    }

    function stylePreview(element: RenderElement, annotation: Annotation) {
        const color = previewColor ?? annotationColor(annotation);

        element.style.setProperty("--annotation-color", color);
        element.style.setProperty(
            "--annotation-fill",
            `${color}${ANNOTATION_FILL_OPACITY[annotation.shape] ?? ANNOTATION_FILL_OPACITY.default}`,
        );
    }

    let layers: Record<SvgShape, SVGSVGElement> | null = null;
    const committedElements = new Map<string, RenderElement>();
    const overlayElements = new WeakSet<RenderElement>();
    let selectedId: string | null = null;

    function setSelected(id: string | null) {
        if (selectedId) {
            committedElements.get(selectedId)?.classList.remove("selected");
        }

        selectedId = id;

        if (selectedId) {
            committedElements.get(selectedId)?.classList.add("selected");
        }
    }

    function updateAppearance(annotation: Annotation) {
        const element = annotation.id ? committedElements.get(annotation.id) : undefined;

        if (!element) {
            return;
        }

        const color = annotationColor(annotation);
        const opacity = ANNOTATION_FILL_OPACITY[annotation.shape] ?? ANNOTATION_FILL_OPACITY.default;

        element.style.setProperty("--annotation-color", color);
        element.style.setProperty("--annotation-fill", `${color}${opacity}`);
    }

    function register(element: RenderElement, annotation: Annotation) {
        if (!annotation.id) {
            return;
        }

        element.dataset.annotationId = annotation.id;
        committedElements.set(annotation.id, element);

        updateAppearance(annotation);

        if (annotation.id === selectedId) {
            element.classList.add("selected");
        }
    }

    function initializeLayers() {
        layers = {
            polygon: surface.createSvgLayer("polygon-layer"),
            brush: surface.createSvgLayer("brush-layer"),
            "assisted-brush": surface.createSvgLayer("assisted-brush-layer"),
        };
    }

    function canRender(shape: Shape): boolean {
        switch (shape) {
            case "rectangle":
            case "circle":
                return true;
            case "polygon":
            case "brush":
            case "assisted-brush":
                return layers !== null;
            default:
                throw new Error(`Unsupported annotation shape: ${String(shape)}`);
        }
    }

    function update(element: RenderElement, annotation: Annotation) {
        if (element.classList.contains("preview")) {
            stylePreview(element, annotation);
        }

        switch (annotation.shape) {
            case "rectangle":
            case "circle":
                surface.updateOverlay(element, overlayBounds(annotation));
                break;
            case "polygon":
                element.setAttribute("points", annotation.points.map(({ x, y }) => `${x},${y}`).join(" "));
                break;
            case "brush":
                element.setAttribute("d", brushPathData(annotation.points));
                element.setAttribute("stroke-width", String(annotation.radius * 2));
                break;
            case "assisted-brush":
                element.setAttribute("d", assistedBrushPathData(annotation.runs));
                break;
        }
    }

    function render(annotation: Annotation, options?: { preview?: boolean }): RenderElement {
        // Also reject unknown shapes from untyped runtime callers.
        canRender(annotation.shape);

        const preview = options?.preview === true;
        let element: RenderElement;

        if (annotation.shape === "rectangle" || annotation.shape === "circle") {
            element = surface.createElement("div");
            element.classList.add("segmentation-overlay", annotation.shape);

            surface.addOverlay(element, overlayBounds(annotation));
            overlayElements.add(element);
        } else {
            if (!layers) {
                throw new Error("Annotation renderer layers are not initialized.");
            }

            element = surface.createSvgElement(annotation.shape === "polygon" ? "polygon" : "path");
            element.classList.add(`${annotation.shape}-segmentation`);

            layers[annotation.shape].append(element);
            update(element, annotation);
        }

        if (preview) {
            element.classList.add("preview");
            stylePreview(element, annotation);
        } else {
            register(element, annotation);
        }

        return element;
    }

    function finalizePreview(element: RenderElement, annotation: Annotation) {
        update(element, annotation);
        element.classList.remove("preview");

        register(element, annotation);
    }

    function remove(element: RenderElement) {
        const id = element.dataset.annotationId;

        if (id === selectedId) {
            setSelected(null);
        }

        if (id) {
            committedElements.delete(id);
        }

        if (overlayElements.has(element)) {
            surface.removeOverlay(element);
        } else {
            element.remove();
        }
    }

    function removeAnnotation(id: string) {
        const element = committedElements.get(id);

        if (element) {
            remove(element);
        }
    }

    return {
        setPreviewColor,
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
