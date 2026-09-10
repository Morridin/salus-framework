import type { BrowserEnvironment } from "./environment.js";

// Triggers a browser download of text content without extra dependencies.
export function downloadTextFile(
    { window, document }: Pick<BrowserEnvironment, "window" | "document">,
    filename: string,
    contents: string,
    type: string,
) {
    const file = new window.Blob([contents], { type });
    const fileUrl = window.URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = filename;

    link.click();

    window.URL.revokeObjectURL(fileUrl);
}
