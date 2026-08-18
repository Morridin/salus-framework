const VALID_TOOLS = new Set(["rectangle", "circle", "polygon", "brush"]);

export function createToolbarBridge({channel, viewerPluginId, toolbarPluginId}) {
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

    function subscribe(onToolChanged) {
        const listener = event => {
            const message = event.data;
            const {payload, sourcePluginId} = message ?? {};
            if (
                message?.targetPluginId === viewerPluginId &&
                sourcePluginId === toolbarPluginId &&
                payload?.type === "segmentation-tool-changed" &&
                VALID_TOOLS.has(payload.tool)
            ) {
                const brushRadius = Number(payload.brushRadius);
                onToolChanged(
                    payload.tool,
                    Number.isFinite(brushRadius) && brushRadius > 0
                        ? brushRadius
                        : null,
                );
            }
        };

        channel.addEventListener("message", listener);
        return () => channel.removeEventListener("message", listener);
    }

    return {publishAnnotation, requestState, subscribe};
}
