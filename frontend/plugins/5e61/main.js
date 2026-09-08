(() => {
    const PLUGIN_ID = "5e61";
    const VIEWER_PLUGIN_ID = "a11e";
    const channel = new BroadcastChannel("salus:plugin-messages");
    const buttons = [...document.querySelectorAll("[data-tool]")];
    const toolbar = document.querySelector(".toolbar");
    const radiusInput = document.getElementById("brush-radius");
    const radiusOutput = document.getElementById("brush-radius-output");
    const toleranceInput = document.getElementById("brush-tolerance");
    const toleranceOutput = document.getElementById("brush-tolerance-output");
    const exportButton = document.getElementById("export-geojson");
    const importButton = document.getElementById("import-geojson");
    const importFileInput = document.getElementById("import-geojson-file");
    let selectedButton = null;

    function sendSelection() {
        channel.postMessage({
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: {
                type: "segmentation-tool-changed",
                tool: selectedButton?.dataset.tool ?? "none",
                brushRadius: radiusInput.valueAsNumber,
                brushTolerance: toleranceInput.valueAsNumber,
            },
        });
    }

    function selectTool(buttonToSelect) {
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

    function bindSlider(input, output, format) {
        input.addEventListener("input", () => {
            output.value = format(input.value);
            sendSelection();
        });
    }

    bindSlider(radiusInput, radiusOutput, value => `${value} px`);
    bindSlider(toleranceInput, toleranceOutput, value => value);

    importButton.addEventListener("click", () => importFileInput.click());

    importFileInput.addEventListener("change", () => {
        const file = importFileInput.files[0];
        importFileInput.value = "";
        if (!file) return;

        channel.postMessage({
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: {type: "segmentation-import-request", file},
        });
    });

    exportButton.addEventListener("click", () => {
        channel.postMessage({
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: {
                type: "segmentation-export-request",
            },
        });
    });

    channel.addEventListener("message", event => {
        const message = event.data;
        if (
            message?.targetPluginId === PLUGIN_ID &&
            message.sourcePluginId === VIEWER_PLUGIN_ID &&
            message.payload?.type === "segmentation-state-request"
        ) {
            sendSelection();
        }
    });

    selectTool(selectedButton);
})();
