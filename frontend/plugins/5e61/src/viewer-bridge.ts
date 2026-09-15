export interface ToolbarChannel {
    postMessage(message: PluginProtocol.PluginEnvelope<PluginProtocol.ToolbarToViewerPayload>): void;
    addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

type CategoryState = Extract<PluginProtocol.ViewerToToolbarPayload<unknown>, { type: "categories-state" }>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isCategory(value: unknown): value is PluginProtocol.Category {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        typeof value.color === "string" &&
        /^#[0-9a-f]{6}$/i.test(value.color)
    );
}

/** Owns the toolbar's message envelope and validation boundary. */
export function createViewerBridge(channel: ToolbarChannel) {
    function send(payload: PluginProtocol.ToolbarToViewerPayload) {
        channel.postMessage({ sourcePluginId: "5e61", targetPluginId: "a11e", payload });
    }

    function subscribe(handlers: { onCategories: (state: CategoryState) => void; onStateRequested: () => void }) {
        channel.addEventListener("message", ({ data }) => {
            if (
                !isRecord(data) ||
                data.targetPluginId !== "5e61" ||
                data.sourcePluginId !== "a11e" ||
                !isRecord(data.payload)
            ) {
                return;
            }

            const payload = data.payload;

            if (payload.type === "segmentation-state-request") {
                handlers.onStateRequested();
            } else if (
                payload.type === "categories-state" &&
                Array.isArray(payload.categories) &&
                payload.categories.every(isCategory) &&
                (payload.activeCategoryId === null || typeof payload.activeCategoryId === "string")
            ) {
                handlers.onCategories({
                    type: "categories-state",
                    categories: payload.categories,
                    activeCategoryId: payload.activeCategoryId,
                });
            }
        });
    }

    return { send, subscribe, requestCategories: () => send({ type: "categories-request" }) };
}
