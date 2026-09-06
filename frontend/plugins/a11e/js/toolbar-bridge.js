const VALID_TOOLS = new Set([
    "rectangle",
    "circle",
    "polygon",
    "brush",
    "assisted-brush",
]);

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

    function handleToolChange(payload, onToolChanged) {
        if (!VALID_TOOLS.has(payload.tool)) return;

        const brushRadius = Number(payload.brushRadius);
        const brushTolerance = Number(payload.brushTolerance);
        const validRadius = Number.isFinite(brushRadius) && brushRadius > 0
            ? brushRadius
            : null;
        const validTolerance = (
            Number.isFinite(brushTolerance) && brushTolerance >= 0
        ) ? Math.min(255, brushTolerance) : null;

        onToolChanged?.(payload.tool, validRadius, validTolerance);
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
