const DEFAULT_IMAGE_URL = "sample.svg";
const OPENSEADRAGON_IMAGES_URL =
    "https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/images/";

// Owns OpenSeadragon setup, image readiness, and viewer feedback.
export function createViewerSession({window, document, OpenSeadragon}) {
    const viewerElement = document.getElementById("image-viewer");
    const errorElement = document.getElementById("viewer-error");
    const statusElement = document.getElementById("viewer-status");
    const imageUrl = new URLSearchParams(window.location.search).get("image") ||
        DEFAULT_IMAGE_URL;
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

    viewer.addHandler("open-failed", event => {
        imageReady = false;
        errorElement.hidden = false;
        errorElement.textContent = `Could not open image: ${event.message || imageUrl}`;
    });

    function reportStatus(message) {
        statusElement.textContent = message;
        statusElement.hidden = !message;
    }

    function onImageOpened(initializeLayers) {
        viewer.addHandler("open", () => {
            initializeLayers();
            imageReady = true;
        });
    }

    return {
        viewer,
        viewerElement,
        imageUrl,
        isImageReady: () => imageReady,
        reportStatus,
        onImageOpened,
    };
}
