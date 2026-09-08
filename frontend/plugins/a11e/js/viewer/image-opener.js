// Local files stay in the browser. Decode before replacing the current image.
export function setupImageOpener({window, document, hasAnnotations, openImage, reportStatus}) {
    const button = document.getElementById("open-image");
    const input = document.getElementById("open-image-file");
    let currentUrl = null;

    button.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        button.disabled = true;
        const url = window.URL.createObjectURL(file);
        try {
            const image = new window.Image();
            image.src = url;
            await image.decode();
            if (hasAnnotations() && !window.confirm(
                "Opening another image will clear the current annotations. Export them first if you want to keep them. Continue?",
            )) {
                window.URL.revokeObjectURL(url);
                return;
            }
            openImage(url);
            if (currentUrl) window.URL.revokeObjectURL(currentUrl);
            currentUrl = url;
        } catch {
            window.URL.revokeObjectURL(url);
            reportStatus("Could not open this image. Try a PNG or JPEG file.");
        } finally {
            button.disabled = false;
        }
    });
}
