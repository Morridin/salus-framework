import type { BrowserEnvironment } from "./shared/environment.js";
import type { MessageChannel } from "./messaging/toolbar-bridge.js";
import { createAnnotationPanel } from "./annotations/panel.js";
import { createAnnotationController } from "./annotations/controller.js";
import { createAnnotationRenderer } from "./annotations/renderer.js";
import { createViewerAdapter } from "./viewer/viewer-adapter.js";
import { createToolbarBridge } from "./messaging/toolbar-bridge.js";
import { createToolController } from "./tools/core/tool-controller.js";
import { createViewerSession } from "./viewer/viewer-session.js";
import { setupImageOpener } from "./viewer/image-opener.js";
import { createIntensitySampler } from "./tools/assisted-brush/sampler.js";
import { CHANNEL_NAME } from "./shared/plugin-config.js";

// Composes the viewer, annotation workflows, drawing tools, and toolbar.
export function startImageViewer({
    window,
    document,
    OpenSeadragon,
    channel,
}: BrowserEnvironment & { channel: MessageChannel }) {
    const env = { window, document, OpenSeadragon };
    const createdSession = createViewerSession(env);

    if (!createdSession) {
        return null;
    }

    const session = createdSession;

    const surface = createViewerAdapter({ env, session });
    const renderer = createAnnotationRenderer<HTMLElement | SVGElement>({ surface });

    const toolbar = createToolbarBridge({ channel });
    const annotations = createAnnotationController<HTMLElement | SVGElement>({ env, session, renderer, toolbar });

    createAnnotationPanel({ env, controller: annotations });

    const sampler = createIntensitySampler({ env, session });
    const tools = createToolController<HTMLElement | SVGElement>({
        env,
        session,
        sampler,
        surface,
        renderer,
        annotations,
    });

    function openImage(url: string) {
        tools.cancelDrawing();
        sampler.setImage(url);
        annotations.clearAnnotations();
        session.viewer.clearOverlays();

        session.openImage(url);
    }

    session.onImageOpened(renderer.initializeLayers);
    setupImageOpener({ env, annotations, openImage, session });

    toolbar.subscribe({
        onToolChanged: tools.selectTool,
        onExportRequested: annotations.exportAnnotationsAsGeoJson,
        onImportRequested: annotations.importAnnotationsFromGeoJson,
    });
    toolbar.requestState();

    window.imageViewer = session.viewer;
    Object.defineProperty(window, "imageViewerAnnotations", {
        configurable: true,
        get: () => annotations.annotations,
    });

    return {
        viewer: session.viewer,
        get annotations() {
            return annotations.annotations;
        },
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
