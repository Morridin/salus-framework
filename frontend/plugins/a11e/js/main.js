import {createAnnotationStore} from "./annotation-store.js";
import {createBrushTool} from "./brush-tool.js";
import {createDragShapeTool} from "./drag-shape-tool.js";
import {createPolygonTool} from "./polygon-tool.js";
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

    createDragShapeTool({
        viewer,
        document,
        createAnnotation,
        getActiveTool: () => activeTool,
    });
    const polygonTool = createPolygonTool({
        viewer,
        document,
        OpenSeadragon,
        createAnnotation,
        isActive: () => activeTool === "polygon",
    });
    const brushTool = createBrushTool({
        viewer,
        document,
        createAnnotation,
        isActive: () => activeTool === "brush",
        getRadius: () => brushRadius,
    });

    toolbar.subscribe((tool, nextBrushRadius) => {
        if (activeTool !== tool) {
            polygonTool.cancel();
            brushTool.cancel();
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
