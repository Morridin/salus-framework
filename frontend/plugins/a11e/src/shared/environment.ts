import type { OpenSeadragonApi, Viewer } from "../viewer/types.js";

export type BrowserWindow = Pick<Window, "location" | "confirm"> & {
    URL: typeof URL;
    Blob: typeof Blob;
    Image?: typeof Image;
    imageViewer?: Viewer;
};

export interface BrowserEnvironment {
    window: BrowserWindow;
    document: Document;
    OpenSeadragon: OpenSeadragonApi;
}

/** Fail at setup with the missing control's name instead of during a gesture. */
export function requiredElement<K extends keyof HTMLElementTagNameMap>(
    document: Document,
    id: string,
    tag: K,
): HTMLElementTagNameMap[K] {
    const element = document.getElementById(id);

    if (!element || element.localName !== tag) {
        throw new Error(`Expected <${tag}> element #${id}.`);
    }

    // The tag was checked above; DOM getElementById does not narrow by tag.
    return element as HTMLElementTagNameMap[K];
}
