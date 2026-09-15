import type { OpenSeadragonApi, Viewer } from "../viewer/types.js";
import type { CommittedAnnotation } from "./types.js";

export type BrowserWindow = Pick<Window, "location" | "confirm"> & {
    URL: typeof URL;
    Blob: typeof Blob;
    Image?: typeof Image;
    imageViewer?: Viewer;
    imageViewerAnnotations?: CommittedAnnotation[];
};

export interface BrowserEnvironment {
    window: BrowserWindow;
    document: Document;
    OpenSeadragon: OpenSeadragonApi;
}
