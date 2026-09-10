import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BrowserWindow } from "../../plugins/a11e/src/shared/environment.js";
import type { CommittedAnnotation } from "../../plugins/a11e/src/shared/types.js";

export function createDom(plugin = "a11e") {
    const dom = new JSDOM(readFileSync(resolve(`plugins/${plugin}/index.html`), "utf8"), { url: "http://localhost/" });
    const document = dom.window.document;
    const window: BrowserWindow & { readonly imageViewerAnnotations?: CommittedAnnotation[] } = {
        location: dom.window.location,
        confirm: () => true,
        URL: class extends URL {},
        Blob,
    };

    function fire(element: Element, type: string) {
        element.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
    }

    async function change(element: Element) {
        fire(element, "change");
        await new Promise<void>((resolve) => setImmediate(resolve));
    }

    function setFiles(element: Element, files: Blob[]) {
        Object.defineProperty(element, "files", { configurable: true, value: files });
    }

    function imageConstructor(onCreate: (image: HTMLImageElement) => void = () => {}) {
        // jsdom exposes constructors through an untyped window index signature.
        const NativeImage = dom.window.Image as typeof Image;

        return new Proxy(NativeImage, {
            construct() {
                const image = document.createElement("img");

                image.decode = () => Promise.resolve();
                onCreate(image);

                return image;
            },
        });
    }

    return { dom, document, window, fire, change, setFiles, imageConstructor };
}
