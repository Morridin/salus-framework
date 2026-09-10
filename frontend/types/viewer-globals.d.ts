import type { OpenSeadragonApi, Viewer } from "../plugins/a11e/src/viewer/types.js";
import type { CommittedAnnotation } from "../plugins/a11e/src/shared/types.js";

// The CDN script supplies OpenSeadragon; main.ts publishes debug snapshots.
declare global {
    interface Window {
        OpenSeadragon: OpenSeadragonApi;
        imageViewer?: Viewer;
        readonly imageViewerAnnotations?: CommittedAnnotation[];
    }
}

export {};
