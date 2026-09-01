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
    let selectedButton = buttons[0];

    function sendSelection() {
        channel.postMessage({
            sourcePluginId: PLUGIN_ID,
            targetPluginId: VIEWER_PLUGIN_ID,
            payload: {
                type: "segmentation-tool-changed",
                tool: selectedButton.dataset.tool,
                brushRadius: Number(radiusInput.value),
                brushTolerance: Number(toleranceInput.value),
            },
        });
    }

    function selectTool(buttonToSelect) {
        selectedButton = buttonToSelect;
        toolbar.dataset.tool = buttonToSelect.dataset.tool;

        for (const button of buttons) {
            button.setAttribute("aria-pressed", String(button === buttonToSelect));
        }

        sendSelection();
    }

    for (const button of buttons) {
        button.addEventListener("click", () => selectTool(button));
    }

    radiusInput.addEventListener("input", () => {
        radiusOutput.value = `${radiusInput.value} px`;
        sendSelection();
    });

    toleranceInput.addEventListener("input", () => {
        toleranceOutput.value = toleranceInput.value;
        sendSelection();
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
