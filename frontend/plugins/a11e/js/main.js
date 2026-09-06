import {createAnnotationController} from "./annotations/annotation-controller.js";
import {createAnnotationRenderer} from "./annotations/annotation-renderer.js";
import {createViewerAdapter} from "./viewer/viewer-adapter.js";
import {createToolbarBridge} from "./toolbar/toolbar-bridge.js";
import {createToolController} from "./tools/tool-controller.js";
import {createViewerSession} from "./viewer/viewer-session.js";

const TOOLBAR_PLUGIN_ID = "5e61";
const VIEWER_PLUGIN_ID = "a11e";
const CHANNEL_NAME = "salus:plugin-messages";

// Composes the viewer, annotation workflows, drawing tools, and toolbar.
export function startImageViewer({window, document, OpenSeadragon, channel}) {
    const session = createViewerSession({window, document, OpenSeadragon});
    if (!session) return null;

    const {viewer, viewerElement, imageUrl, isImageReady, reportStatus} = session;
    const surface = createViewerAdapter({viewer, document});
    const renderer = createAnnotationRenderer({surface});
    const toolbar = createToolbarBridge({
        channel,
        viewerPluginId: VIEWER_PLUGIN_ID,
        toolbarPluginId: TOOLBAR_PLUGIN_ID,
    });
    const annotations = createAnnotationController({
        window,
        document,
        renderer,
        publishAnnotation: toolbar.publishAnnotation,
        isImageReady,
        reportStatus,
    });
    const tools = createToolController({
        window,
        document,
        OpenSeadragon,
        viewer,
        viewerElement,
        imageUrl,
        surface,
        renderer,
        createAnnotation: annotations.createAnnotation,
        reportStatus,
    });

    session.onImageOpened(renderer.initializeLayers);
    toolbar.subscribe({
        onToolChanged: tools.selectTool,
        onExportRequested: annotations.exportAnnotationsAsGeoJson,
        onImportRequested: annotations.importAnnotationsFromGeoJson,
    });
    toolbar.requestState();

    window.imageViewer = viewer;
    window.imageViewerAnnotations = annotations.annotations;
    return {viewer, annotations: annotations.annotations};
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    startImageViewer({
        window,
        document,
        OpenSeadragon: window.OpenSeadragon,
        channel: new window.BroadcastChannel(CHANNEL_NAME),
    });
}
