import { requiredElement } from "../shared/environment.js";
import type { BrowserEnvironment } from "../shared/environment.js";

export type ViewerSession = NonNullable<ReturnType<typeof createViewerSession>>;

const DEFAULT_IMAGE_URL = "sample.svg";
const OPENSEADRAGON_IMAGES_URL = "https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/images/";

// Owns OpenSeadragon setup, image readiness, and viewer feedback.
export function createViewerSession({ window, document, OpenSeadragon }: BrowserEnvironment) {
    const viewerElement = requiredElement(document, "image-viewer", "main");
    const errorElement = requiredElement(document, "viewer-error", "p");
    const statusElement = requiredElement(document, "viewer-status", "p");
    const imageUrl = new URLSearchParams(window.location.search).get("image") || DEFAULT_IMAGE_URL;
    let imageReady = false;

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

    viewer.addHandler("open-failed", (event) => {
        imageReady = false;
        errorElement.hidden = false;
        errorElement.textContent = `Could not open image: ${event.message || imageUrl}`;
    });

    function reportStatus(message: string) {
        statusElement.textContent = message;
        statusElement.hidden = !message;
    }

    function onImageOpened(initializeLayers: () => void) {
        viewer.addHandler("open", () => {
            initializeLayers();
            imageReady = true;
            errorElement.hidden = true;
        });
    }

    function openImage(url: string) {
        imageReady = false;
        errorElement.hidden = true;
        reportStatus("");
        viewer.open({ type: "image", url, buildPyramid: false });
    }

    return {
        viewer,
        viewerElement,
        imageUrl,
        isImageReady: () => imageReady,
        reportStatus,
        onImageOpened,
        openImage,
    };
}
