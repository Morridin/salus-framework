(() => {
    function requireControl<K extends "input" | "output">(id: string, tag: K): HTMLElementTagNameMap[K] {
        const element = document.getElementById(id);

        if (!element || element.localName !== tag) {
            throw new Error(`Expected <${tag}> element #${id}.`);
        }

        return element as HTMLElementTagNameMap[K];
    }

    function isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
    }

    const PLUGIN_ID = "5e61";
    const VIEWER_PLUGIN_ID = "a11e";
    const STATE_REQUEST = "segmentation-state-request" satisfies PluginProtocol.ViewerToToolbarPayload<unknown>["type"];
    const channel = new BroadcastChannel("salus:plugin-messages");
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-tool]")];
    const toolbarElement = document.querySelector<HTMLElement>(".toolbar");

    if (!toolbarElement) {
        throw new Error("Toolbar is missing.");
    }

    const toolbar = toolbarElement;
    const radiusInput = requireControl("brush-radius", "input");
    const radiusOutput = requireControl("brush-radius-output", "output");
    const toleranceInput = requireControl("brush-tolerance", "input");
    const toleranceOutput = requireControl("brush-tolerance-output", "output");
    const exportButton = document.getElementById("export-geojson");
    const importButton = document.getElementById("import-geojson");
    const importFileInput = requireControl("import-geojson-file", "input");

    if (!exportButton || !importButton) {
        throw new Error("Toolbar controls are missing.");
    }

    let selectedButton: HTMLButtonElement | null = null;

    function sendSelection() {
        const message: PluginProtocol.PluginEnvelope<PluginProtocol.ToolbarToViewerPayload> = {
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: {
                type: "segmentation-tool-changed",
                tool: selectedButton?.dataset.tool ?? "none",
                brushRadius: radiusInput.valueAsNumber,
                brushTolerance: toleranceInput.valueAsNumber,
            },
        };

        channel.postMessage(message);
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

        const message: PluginProtocol.PluginEnvelope<PluginProtocol.ToolbarToViewerPayload> = {
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: { type: "segmentation-import-request", file },
        };

        channel.postMessage(message);
    });

    exportButton.addEventListener("click", () => {
        const message: PluginProtocol.PluginEnvelope<PluginProtocol.ToolbarToViewerPayload> = {
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: {
                type: "segmentation-export-request",
            },
        };

        channel.postMessage(message);
    });

    channel.addEventListener("message", (event) => {
        const message: unknown = event.data;

        if (
            isRecord(message) &&
            message.targetPluginId === PLUGIN_ID &&
            message.sourcePluginId === VIEWER_PLUGIN_ID &&
            isRecord(message.payload) &&
            message.payload.type === STATE_REQUEST
        ) {
            sendSelection();
        }
    });

    selectTool(selectedButton);
})();
