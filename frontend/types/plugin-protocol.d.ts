/**
 * Cross-plugin messages exchanged over the salus:plugin-messages channel.
 *
 * This file stays a global script (no imports or exports) so the toolbar (5e61)
 * can reference the protocol while remaining a classic script.
 */
declare namespace PluginProtocol {
    type PluginId = "a11e" | "5e61";

    interface PluginEnvelope<TPayload> {
        sourcePluginId: PluginId;
        targetPluginId: PluginId;
        payload: TPayload;
    }

    /** Toolbar (5e61) requests handled by the viewer (a11e). */
    type ToolbarToViewerPayload =
        | {
              type: "segmentation-tool-changed";
              /** Validated against the viewer's known tool IDs before use. */
              tool: string;
              brushRadius: number;
              brushTolerance: number;
          }
        | { type: "segmentation-export-request" }
        | { type: "segmentation-import-request"; file: Blob };

    /** Viewer (a11e) messages handled by the toolbar (5e61). */
    type ViewerToToolbarPayload<TAnnotation> =
        { type: "segmentation-created"; annotation: TAnnotation } | { type: "segmentation-state-request" };
}
