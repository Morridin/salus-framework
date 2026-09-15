import type { BrowserEnvironment } from "../shared/environment.js";

// Local files stay in the browser. Decode before replacing the current image.
interface ImageOpenerOptions {
    env: Pick<BrowserEnvironment, "window" | "document">;
    annotations: { readonly count: number };
    openImage: (url: string) => void;
    session: { reportStatus: (message: string) => void };
}

export function setupImageOpener({ env, annotations, openImage, session }: ImageOpenerOptions) {
    const { window, document } = env;
    const { reportStatus } = session;
    const button = document.querySelector<HTMLButtonElement>("#open-image")!;
    const input = document.querySelector<HTMLInputElement>("#open-image-file")!;
    let currentUrl: string | null = null;

    function openPicker() {
        input.click();
    }

    async function openSelectedFile() {
        const file = input.files?.[0];

        input.value = "";

        if (!file) {
            return;
        }

        button.disabled = true;

        const url = window.URL.createObjectURL(file);

        try {
            if (!window.Image) {
                throw new Error("Image decoding is unavailable.");
            }

            const image = new window.Image();

            image.src = url;
            await image.decode();

            if (
                annotations.count > 0 &&
                !window.confirm(
                    "Opening another image will clear the current annotations. Export them first if you want to keep them. Continue?",
                )
            ) {
                window.URL.revokeObjectURL(url);

                return;
            }

            openImage(url);

            if (currentUrl) {
                window.URL.revokeObjectURL(currentUrl);
            }

            currentUrl = url;
        } catch {
            window.URL.revokeObjectURL(url);
            reportStatus("Could not open this image. Try a PNG or JPEG file.");
        } finally {
            button.disabled = false;
        }
    }

    function onFileChange() {
        void openSelectedFile();
    }

    button.addEventListener("click", openPicker);
    input.addEventListener("change", onFileChange);

    return {
        dispose() {
            button.removeEventListener("click", openPicker);
            input.removeEventListener("change", onFileChange);

            if (currentUrl) {
                window.URL.revokeObjectURL(currentUrl);
                currentUrl = null;
            }
        },
    };
}
