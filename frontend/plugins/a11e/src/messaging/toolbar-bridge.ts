import { isKnownToolId } from "../tools/core/registry.js";
import { TOOLBAR_PLUGIN_ID, VIEWER_PLUGIN_ID } from "../shared/plugin-config.js";
import { isFiniteNumber } from "../shared/numbers.js";
import { isRecord } from "../shared/validation.js";
import type { CommittedAnnotation } from "../shared/types.js";
import type { ToolSelection } from "../tools/core/types.js";

export interface TextFile {
    text(): Promise<string>;
}

export interface MessageChannel {
    postMessage(message: unknown): void;
    addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
    removeEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
}

interface MessageHandlers {
    onToolChanged?: (selection: ToolSelection) => void;
    onExportRequested?: () => void;
    onImportRequested?: (file: TextFile) => Promise<void>;
}

type ViewerPayload = PluginProtocol.ViewerToToolbarPayload<CommittedAnnotation>;

// Pins the handled message types to the shared protocol.
const TOOLBAR_MESSAGE_TYPES = [
    "segmentation-tool-changed",
    "segmentation-export-request",
    "segmentation-import-request",
] as const satisfies readonly PluginProtocol.ToolbarToViewerPayload["type"][];

type ToolbarMessageType = (typeof TOOLBAR_MESSAGE_TYPES)[number];

function isToolbarMessageType(value: unknown): value is ToolbarMessageType {
    return typeof value === "string" && TOOLBAR_MESSAGE_TYPES.some((type) => type === value);
}

function isTextFile(value: unknown): value is TextFile {
    return value instanceof Blob;
}

export function createToolbarBridge({ channel }: { channel: MessageChannel }) {
    function send(payload: ViewerPayload) {
        const message: PluginProtocol.PluginEnvelope<ViewerPayload> = {
            sourcePluginId: VIEWER_PLUGIN_ID,
            targetPluginId: TOOLBAR_PLUGIN_ID,
            payload,
        };

        channel.postMessage(message);
    }

    function publishAnnotation(annotation: CommittedAnnotation) {
        send({ type: "segmentation-created", annotation });
    }

    function requestState() {
        send({ type: "segmentation-state-request" });
    }

    function handleToolbarMessage(message: unknown, handlers: MessageHandlers) {
        if (
            !isRecord(message) ||
            message.sourcePluginId !== TOOLBAR_PLUGIN_ID ||
            message.targetPluginId !== VIEWER_PLUGIN_ID ||
            !isRecord(message.payload)
        ) {
            return;
        }

        const payload = message.payload;

        if (!isToolbarMessageType(payload.type)) {
            return;
        }

        switch (payload.type) {
            case "segmentation-tool-changed":
                if (isKnownToolId(payload.tool)) {
                    const selection: ToolSelection = { tool: payload.tool };

                    if (isFiniteNumber(payload.brushRadius)) {
                        selection.brushRadius = payload.brushRadius;
                    }

                    if (isFiniteNumber(payload.brushTolerance)) {
                        selection.brushTolerance = payload.brushTolerance;
                    }

                    handlers.onToolChanged?.(selection);
                }

                break;
            case "segmentation-export-request":
                handlers.onExportRequested?.();
                break;
            case "segmentation-import-request":
                if (isTextFile(payload.file)) {
                    void handlers.onImportRequested?.(payload.file);
                }

                break;
            default: {
                const unhandled: never = payload.type;

                throw new Error(`Unhandled toolbar message: ${String(unhandled)}`);
            }
        }
    }

    function subscribe(handlers: MessageHandlers) {
        const listener = (event: MessageEvent<unknown>) => handleToolbarMessage(event.data, handlers);

        channel.addEventListener("message", listener);

        return () => channel.removeEventListener("message", listener);
    }

    return { publishAnnotation, requestState, subscribe };
}
