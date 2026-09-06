import {createAnnotationStore} from "./annotation-store.js";
import {createAnnotationRenderer} from "./annotation-renderer.js";
import {createAssistedBrushTool} from "./tools/assisted-brush/tool.js";
import {createBrushTool} from "./tools/brush.js";
import {createDragShapeTool} from "./tools/drag-shape.js";
import {createPolygonTool} from "./tools/polygon.js";
import {createSegmentationSurface} from "./segmentation-surface.js";
import {createToolbarBridge} from "./toolbar-bridge.js";
import {createIntensitySampler} from "./tools/assisted-brush/sampler.js";
import {annotationsToGeoJson} from "./geojson-export.js";

const TOOLBAR_PLUGIN_ID = "5e61";
const VIEWER_PLUGIN_ID = "a11e";
const CHANNEL_NAME = "salus:plugin-messages";
const DEFAULT_IMAGE_URL = "sample.svg";
const OPENSEADRAGON_IMAGES_URL =
    "https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/images/";

export function startImageViewer({window, document, OpenSeadragon, channel}) {
    const viewerElement = document.getElementById("image-viewer");
    const errorElement = document.getElementById("viewer-error");
    const statusElement = document.getElementById("viewer-status");
    const imageUrl = new URLSearchParams(window.location.search).get("image") ||
        DEFAULT_IMAGE_URL;
    let activeTool = "rectangle";
    let brushRadius = 12;
    let brushTolerance = 24;

    viewerElement.dataset.tool = activeTool;

    if (typeof OpenSeadragon !== "function") {
        viewerElement.hidden = true;
        errorElement.hidden = false;
        errorElement.textContent = "The image viewer could not be loaded.";
        return null;
    }

    const viewer = OpenSeadragon({
        id: "image-viewer",
        prefixUrl: OPENSEADRAGON_IMAGES_URL,
        tileSources: {
            type: "image",
            url: imageUrl,
            buildPyramid: false,
        },
        animationTime: 0.3,
        showNavigator: false,
    });

    viewer.addHandler("open-failed", event => {
        errorElement.hidden = false;
        errorElement.textContent = `Could not open image: ${event.message || imageUrl}`;
    });

    const toolbar = createToolbarBridge({
        channel,
        viewerPluginId: VIEWER_PLUGIN_ID,
        toolbarPluginId: TOOLBAR_PLUGIN_ID,
    });
    const annotationStore = createAnnotationStore();
    const intensitySampler = createIntensitySampler({
        window,
        document,
        imageUrl,
    });

    function createAnnotation(annotationData) {
        const annotation = annotationStore.create(annotationData);
        toolbar.publishAnnotation(annotation);
        return annotation;
    }

    function exportAnnotationsAsGeoJson() {
        const geoJson = annotationsToGeoJson(annotationStore.annotations);
        const fileContents = JSON.stringify(geoJson, null, 2);
        const file = new window.Blob(
            [fileContents],
            {type: "application/geo+json"},
        );
        const fileUrl = window.URL.createObjectURL(file);
        const downloadLink = document.createElement("a");

        downloadLink.href = fileUrl;
        downloadLink.download = "segmentations.geojson";
        downloadLink.click();

        window.URL.revokeObjectURL(fileUrl);
    }

    function reportStatus(message) {
        statusElement.textContent = message;
        statusElement.hidden = !message;
    }

    const surface = createSegmentationSurface({viewer, document});
    const renderer = createAnnotationRenderer({surface});
    const tools = {
        rectangle: createDragShapeTool({
            surface,
            renderer,
            tool: "rectangle",
            createAnnotation,
        }),
        circle: createDragShapeTool({
            surface,
            renderer,
            tool: "circle",
            createAnnotation,
        }),
        polygon: createPolygonTool({surface, renderer, createAnnotation}),
        brush: createBrushTool({
            surface,
            renderer,
            createAnnotation,
            getRadius: () => brushRadius,
        }),
        "assisted-brush": createAssistedBrushTool({
            surface,
            renderer,
            sampler: intensitySampler,
            createAnnotation,
            getRadius: () => brushRadius,
            getTolerance: () => brushTolerance,
            reportStatus,
        }),
    };

    function activeToolHandler(name, event) {
        if (!renderer.canRender(activeTool)) return;
        tools[activeTool][name]?.(event);
    }

    viewer.addHandler("open", () => {
        renderer.initializeLayers();
    });
    viewer.addHandler("canvas-press", event => activeToolHandler("press", event));
    viewer.addHandler("canvas-drag", event => activeToolHandler("drag", event));
    viewer.addHandler("canvas-release", event =>
        activeToolHandler("release", event)
    );
    viewer.addHandler("canvas-click", event => activeToolHandler("click", event));

    const pointerTracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: event => activeToolHandler("pointerMove", event),
    });
    pointerTracker.setTracking(true);

    document.addEventListener("keydown", event =>
        activeToolHandler("keyDown", event)
    );

    toolbar.subscribe({
        onToolChanged: (tool, nextBrushRadius, nextBrushTolerance) => {
            if (activeTool !== tool) {
                tools[activeTool].deactivate?.();
            }
            activeTool = tool;
            if (nextBrushRadius !== null) {
                brushRadius = nextBrushRadius;
            }
            if (nextBrushTolerance !== null) {
                brushTolerance = nextBrushTolerance;
            }
            viewerElement.dataset.tool = tool;
        },
        onExportRequested: exportAnnotationsAsGeoJson,
    });
    toolbar.requestState();

    window.imageViewer = viewer;
    window.imageViewerAnnotations = annotationStore.annotations;
    return {viewer, annotations: annotationStore.annotations};
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    startImageViewer({
        window,
        document,
        OpenSeadragon: window.OpenSeadragon,
        channel: new window.BroadcastChannel(CHANNEL_NAME),
    });
}
