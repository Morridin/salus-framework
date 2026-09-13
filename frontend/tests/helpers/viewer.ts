import { startImageViewer } from "../../plugins/a11e/src/main.js";
import type {
    Viewer,
    ViewerEvent,
    ViewerEventName,
    ImageTileSource,
    OpenSeadragonApi,
} from "../../plugins/a11e/src/viewer/types.js";
import { isRecord } from "../../plugins/a11e/src/shared/validation.js";
import { createDom } from "./dom.js";
import { required } from "./assertions.js";

interface SentMessage {
    sourcePluginId: string;
    targetPluginId: string;
    payload: Record<string, unknown>;
}

export function loadViewer() {
    const browser = createDom();
    const { document, window } = browser;
    const handlers = new Map<ViewerEventName, ((event: ViewerEvent) => void)[]>();
    const sentMessages: SentMessage[] = [];
    const downloads: { filename: string; url: string }[] = [];
    const revokedUrls: string[] = [];
    const opened: ImageTileSource[] = [];
    let exportedFile: Blob | null = null;
    let messageListener: ((event: MessageEvent<unknown>) => void) | undefined;
    let viewerDestroyed = false;
    const viewerElement = required(document.getElementById("image-viewer"));
    const statusElement = required(document.getElementById("viewer-status"));
    const overlays: (HTMLElement | SVGElement)[] = [];
    const viewer: Viewer = {
        canvas: viewerElement,
        addHandler(name, handler) {
            const registered = handlers.get(name) ?? [];

            registered.push(handler);
            handlers.set(name, registered);
        },
        removeHandler(name, handler) {
            const registered = handlers.get(name);
            const index = registered?.indexOf(handler) ?? -1;

            if (!registered || index === -1) {
                return;
            }

            registered.splice(index, 1);

            if (registered.length === 0) {
                handlers.delete(name);
            }
        },
        addOverlay({ element }) {
            viewerElement.append(element);
            overlays.push(element);
        },
        removeOverlay(element) {
            const index = overlays.indexOf(element);

            if (index !== -1) {
                overlays.splice(index, 1);
            }

            element.remove();
        },
        updateOverlay() {},
        clearOverlays() {
            for (const element of overlays.splice(0)) {
                element.remove();
            }
        },
        open(source) {
            opened.push(source);
        },
        viewport: {
            pointFromPixel: ({ x, y }) => ({ x, y }),
            viewportToImageCoordinates: (point) => point,
            imageToViewportRectangle: (x, y, width, height) => ({ x, y, width, height }),
        },
        world: { getItemAt: () => ({ getContentSize: () => ({ x: 1000, y: 800 }) }) },
        destroy() {
            viewerDestroyed = true;
        },
    };

    window.URL.createObjectURL = (file) => {
        if (!(file instanceof Blob)) {
            throw new Error("Expected a Blob");
        }

        exportedFile = file;

        return "blob:segmentation-export";
    };

    window.URL.revokeObjectURL = (url) => {
        revokedUrls.push(url);
    };

    browser.dom.window.HTMLAnchorElement.prototype.click = function () {
        downloads.push({ filename: this.download, url: this.href });
    };

    const channel = {
        addEventListener(_type: "message", listener: (event: MessageEvent<unknown>) => void) {
            messageListener = listener;
        },
        removeEventListener() {},
        postMessage(value: unknown) {
            if (
                !isRecord(value) ||
                typeof value.sourcePluginId !== "string" ||
                typeof value.targetPluginId !== "string" ||
                !isRecord(value.payload)
            ) {
                throw new Error("Invalid outgoing message");
            }

            sentMessages.push({
                sourcePluginId: value.sourcePluginId,
                targetPluginId: value.targetPluginId,
                payload: value.payload,
            });
        },
    };
    const OpenSeadragon: OpenSeadragonApi = Object.assign(() => viewer, {
        MouseTracker: class {
            setTracking() {}

            destroy() {}
        },
        Point: class {
            constructor(
                public x: number,
                public y: number,
            ) {}
        },
    });
    const app = required(startImageViewer({ document, window, OpenSeadragon, channel }));

    return {
        ...browser,
        OpenSeadragon,
        app,
        viewerElement,
        statusElement,
        overlays,
        downloads,
        opened,
        sentMessages,
        revokedUrls,
        handlers: {
            get: (name: ViewerEventName) => {
                const registered = handlers.get(name) ?? [];

                return (event: ViewerEvent = {}) => {
                    for (const handler of registered) {
                        handler(event);
                    }
                };
            },
            has: (name: ViewerEventName) => (handlers.get(name)?.length ?? 0) > 0,
        },
        isViewerDestroyed: () => viewerDestroyed,
        keyDown(key: string) {
            document.dispatchEvent(new browser.dom.window.KeyboardEvent("keydown", { key }));
        },
        messageHandler(message: Record<string, unknown>) {
            required(messageListener)(
                new MessageEvent<unknown>("message", { data: { targetPluginId: "a11e", ...message } }),
            );
        },
        getExportedFile: () => required(exportedFile),
        element(id: string) {
            return required(document.getElementById(id));
        },
        input(id: string) {
            return required(document.querySelector<HTMLInputElement>(`#${id}`));
        },
        button(id: string) {
            return required(document.querySelector<HTMLButtonElement>(`#${id}`));
        },
    };
}
