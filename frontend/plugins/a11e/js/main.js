import {createAnnotationStore} from "./annotation-store.js";
import {createBrushTool} from "./brush-tool.js";
import {createDragShapeTool} from "./drag-shape-tool.js";
import {createPolygonTool} from "./polygon-tool.js";
import {createSegmentationSurface} from "./segmentation-surface.js";
import {createToolbarBridge} from "./toolbar-bridge.js";

const TOOLBAR_PLUGIN_ID = "5e61";
const VIEWER_PLUGIN_ID = "a11e";
const CHANNEL_NAME = "salus:plugin-messages";
const DEFAULT_IMAGE_URL = "sample.svg";
const OPENSEADRAGON_IMAGES_URL =
    "https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/images/";

export function startImageViewer({window, document, OpenSeadragon, channel}) {
    const viewerElement = document.getElementById("image-viewer");
    const errorElement = document.getElementById("viewer-error");
    const imageUrl = new URLSearchParams(window.location.search).get("image") ||
        DEFAULT_IMAGE_URL;
    let activeTool = "rectangle";
    let brushRadius = 12;

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

    function createAnnotation(annotationData) {
        const annotation = annotationStore.create(annotationData);
        toolbar.publishAnnotation(annotation);
        return annotation;
    }

    const surface = createSegmentationSurface({viewer, document});
    const tools = {
        rectangle: createDragShapeTool({
            surface,
            tool: "rectangle",
            createAnnotation,
        }),
        circle: createDragShapeTool({
            surface,
            tool: "circle",
            createAnnotation,
        }),
        polygon: createPolygonTool({surface, createAnnotation}),
        brush: createBrushTool({
            surface,
            createAnnotation,
            getRadius: () => brushRadius,
        }),
    };

    function activeToolHandler(name, event) {
        tools[activeTool][name]?.(event);
    }

    viewer.addHandler("open", event => {
        Object.values(tools).forEach(tool => tool.open?.(event));
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

    toolbar.subscribe((tool, nextBrushRadius) => {
        if (activeTool !== tool) {
            tools[activeTool].deactivate?.();
        }
        activeTool = tool;
        if (nextBrushRadius !== null) {
            brushRadius = nextBrushRadius;
        }
        viewerElement.dataset.tool = tool;
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
