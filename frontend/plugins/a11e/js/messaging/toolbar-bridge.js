import {isKnownToolId} from "../tools/core/registry.js";

export function createToolbarBridge({
    channel,
    viewerPluginId,
    toolbarPluginId,
}) {
    function publishAnnotation(annotation) {
        channel.postMessage({
            sourcePluginId: viewerPluginId,
            targetPluginId: toolbarPluginId,
            payload: {
                type: "segmentation-created",
                annotation,
            },
        });
    }

    function requestState() {
        channel.postMessage({
            sourcePluginId: viewerPluginId,
            targetPluginId: toolbarPluginId,
            payload: {type: "segmentation-state-request"},
        });
    }

    function isToolbarMessage(message) {
        return (
            message?.sourcePluginId === toolbarPluginId &&
            message?.targetPluginId === viewerPluginId
        );
    }

    // Pure router: validity is checked against the registry here as a cheap
    // pre-filter, while sanitizing lives in the settings store (the single
    // rule). The selection object is forwarded untouched so new options need
    // no bridge changes.
    function handleToolChange(payload, onToolChanged) {
        if (!isKnownToolId(payload?.tool)) return;

        onToolChanged?.({
            tool: payload.tool,
            brushRadius: payload.brushRadius,
            brushTolerance: payload.brushTolerance,
        });
    }

    function handleToolbarMessage(message, messageHandlers) {
        if (!isToolbarMessage(message)) return;

        const payload = message.payload;

        if (payload?.type === "segmentation-tool-changed") {
            handleToolChange(payload, messageHandlers.onToolChanged);
            return;
        }

        if (payload?.type === "segmentation-export-request") {
            messageHandlers.onExportRequested?.();
        }

        if (payload?.type === "segmentation-import-request") {
            messageHandlers.onImportRequested?.(payload.file);
        }
    }

    function subscribe(messageHandlers) {
        const listener = event => {
            handleToolbarMessage(event.data, messageHandlers);
        };

        channel.addEventListener("message", listener);
        return () => channel.removeEventListener("message", listener);
    }

    return {publishAnnotation, requestState, subscribe};
}
