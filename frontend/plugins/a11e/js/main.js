import {createAnnotationPanel} from "./annotations/panel.js";
import {createAnnotationController} from "./annotations/controller.js";
import {createAnnotationRenderer} from "./annotations/renderer.js";
import {createViewerAdapter} from "./viewer/viewer-adapter.js";
import {createToolbarBridge} from "./messaging/toolbar-bridge.js";
import {createToolController} from "./tools/core/tool-controller.js";
import {createViewerSession} from "./viewer/viewer-session.js";
import {setupImageOpener} from "./viewer/image-opener.js";
import {createIntensitySampler} from "./tools/assisted-brush/sampler.js";

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
    createAnnotationPanel({document, controller: annotations});
    const sampler = createIntensitySampler({window, document, imageUrl});
    const tools = createToolController({
        document,
        OpenSeadragon,
        viewer,
        viewerElement,
        sampler,
        surface,
        renderer,
        commitAnnotation: annotations.commitAnnotation,
        reportStatus,
        isImageReady,
    });

    session.onImageOpened(renderer.initializeLayers);
    setupImageOpener({
        window,
        document,
        hasAnnotations: () => annotations.annotations.length > 0,
        reportStatus,
        openImage(url) {
            tools.cancelDrawing();
            sampler.setImage(url);
            annotations.clearAnnotations();
            viewer.clearOverlays();
            session.openImage(url);
        },
    });
    toolbar.subscribe({
        onToolChanged: tools.selectTool,
        onExportRequested: annotations.exportAnnotationsAsGeoJson,
        onImportRequested: annotations.importAnnotationsFromGeoJson,
    });
    toolbar.requestState();

    window.imageViewer = viewer;
    Object.defineProperty(window, "imageViewerAnnotations", {
        configurable: true,
        get: () => annotations.annotations,
    });
    return {
        viewer,
        get annotations() { return annotations.annotations; },
    };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    startImageViewer({
        window,
        document,
        OpenSeadragon: window.OpenSeadragon,
        channel: new window.BroadcastChannel(CHANNEL_NAME),
    });
}
