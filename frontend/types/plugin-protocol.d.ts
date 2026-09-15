/**
 * Cross-plugin messages exchanged over the salus:plugin-messages channel.
 *
 * Shared ambient types keep both independently deployed plugins on the same protocol.
 */
declare namespace PluginProtocol {
    type PluginId = "a11e" | "5e61";

    interface PluginEnvelope<TPayload> {
        sourcePluginId: PluginId;
        targetPluginId: PluginId;
        payload: TPayload;
    }

    interface Category {
        id: string;
        name: string;
        color: string;
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
        | { type: "categories-request" }
        | { type: "category-select"; id: string | null }
        | { type: "category-save"; id?: string; name: string; color: string }
        | { type: "segmentation-export-request" }
        | { type: "segmentation-import-request"; file: Blob };

    /** Viewer (a11e) messages handled by the toolbar (5e61). */
    type ViewerToToolbarPayload<TAnnotation> =
        | { type: "categories-state"; categories: Category[]; activeCategoryId: string | null }
        | { type: "segmentation-created"; annotation: TAnnotation }
        | { type: "segmentation-state-request" };
}
