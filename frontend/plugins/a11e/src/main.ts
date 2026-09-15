import type { BrowserEnvironment } from "./shared/environment.js";
import type { CommittedAnnotation } from "./shared/types.js";
import type { Viewer } from "./viewer/types.js";
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
import { createCategorySync } from "./messaging/category-sync.js";
import { CHANNEL_NAME } from "./shared/plugin-config.js";

export interface ViewerApplication {
    readonly viewer: Viewer;
    readonly annotations: CommittedAnnotation[];
    dispose(): void;
}

// Composes the viewer, annotation workflows, drawing tools, and toolbar.
export function startImageViewer({
    window,
    document,
    OpenSeadragon,
    channel,
}: BrowserEnvironment & { channel: MessageChannel }): ViewerApplication | null {
    const env = { window, document, OpenSeadragon };
    const createdSession = createViewerSession(env);

    if (!createdSession) {
        return null;
    }

    const session = createdSession;

    const surface = createViewerAdapter({ env, session });
    const renderer = createAnnotationRenderer({ surface });

    const toolbar = createToolbarBridge({ channel });
    const annotations = createAnnotationController({ env, session, renderer, toolbar });

    const panel = createAnnotationPanel({ env, controller: annotations });

    const sampler = createIntensitySampler({ env, session });

    const tools = createToolController({
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

    const imageOpener = setupImageOpener({ env, annotations, openImage, session });

    const categorySync = createCategorySync({ annotations, toolbar, setPreviewColor: renderer.setPreviewColor });

    const unsubscribeToolbar = toolbar.subscribe({
        ...categorySync.handlers,
        onToolChanged: tools.selectTool,
        onExportRequested: annotations.exportAnnotationsAsGeoJson,
        onImportRequested: annotations.importAnnotationsFromGeoJson,
    });

    toolbar.requestState();
    categorySync.publish();

    window.imageViewer = session.viewer;
    Object.defineProperty(window, "imageViewerAnnotations", {
        configurable: true,
        get: () => annotations.annotations,
    });

    let disposed = false;

    function dispose() {
        if (disposed) {
            return;
        }

        disposed = true;

        unsubscribeToolbar();
        categorySync.dispose();
        panel?.dispose();
        tools.dispose();
        imageOpener.dispose();
        sampler.dispose();

        delete window.imageViewer;
        delete window.imageViewerAnnotations;

        session.dispose();
    }

    return {
        viewer: session.viewer,
        get annotations() {
            return annotations.annotations;
        },
        dispose,
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
