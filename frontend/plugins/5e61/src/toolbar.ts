import { createCategoryPanel } from "./category-panel.js";
import { createViewerBridge } from "./viewer-bridge.js";
import type { ToolbarChannel } from "./viewer-bridge.js";

export function startToolbar(document: Document, channel: ToolbarChannel) {
    const bridge = createViewerBridge(channel);
    const categories = createCategoryPanel(document, bridge.send);
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-tool]")];
    const toolbar = document.querySelector<HTMLElement>(".toolbar")!;
    const radiusInput = document.querySelector<HTMLInputElement>("#brush-radius")!;
    const radiusOutput = document.querySelector<HTMLOutputElement>("#brush-radius-output")!;
    const toleranceInput = document.querySelector<HTMLInputElement>("#brush-tolerance")!;
    const toleranceOutput = document.querySelector<HTMLOutputElement>("#brush-tolerance-output")!;
    const exportButton = document.querySelector<HTMLButtonElement>("#export-geojson")!;
    const importButton = document.querySelector<HTMLButtonElement>("#import-geojson")!;
    const importFileInput = document.querySelector<HTMLInputElement>("#import-geojson-file")!;

    let selectedButton: HTMLButtonElement | null = null;

    function sendSelection() {
        const payload: PluginProtocol.ToolbarToViewerPayload = {
            type: "segmentation-tool-changed",
            tool: selectedButton?.dataset.tool ?? "none",
            brushRadius: radiusInput.valueAsNumber,
            brushTolerance: toleranceInput.valueAsNumber,
        };

        bridge.send(payload);
    }

    function selectTool(buttonToSelect: HTMLButtonElement | null) {
        selectedButton = buttonToSelect;
        toolbar.dataset.tool = buttonToSelect?.dataset.tool ?? "none";

        for (const button of buttons) {
            button.setAttribute("aria-pressed", String(button === buttonToSelect));
        }

        sendSelection();
    }

    for (const button of buttons) {
        button.addEventListener("click", () => selectTool(selectedButton === button ? null : button));
    }

    function bindSlider(input: HTMLInputElement, output: HTMLOutputElement, format: (value: string) => string) {
        input.addEventListener("input", () => {
            output.value = format(input.value);
            sendSelection();
        });
    }

    bindSlider(radiusInput, radiusOutput, (value) => `${value} px`);
    bindSlider(toleranceInput, toleranceOutput, (value) => value);

    importButton.addEventListener("click", () => importFileInput.click());

    importFileInput.addEventListener("change", () => {
        const file = importFileInput.files?.[0];

        importFileInput.value = "";

        if (!file) {
            return;
        }

        const payload: PluginProtocol.ToolbarToViewerPayload = { type: "segmentation-import-request", file };

        bridge.send(payload);
    });

    exportButton.addEventListener("click", () => {
        const payload: PluginProtocol.ToolbarToViewerPayload = {
            type: "segmentation-export-request",
        };

        bridge.send(payload);
    });

    bridge.subscribe({
        onCategories: categories.update,
        onStateRequested() {
            sendSelection();
            bridge.requestCategories();
        },
    });
    bridge.requestCategories();
    selectTool(selectedButton);
}
