import { requiredElement } from "../shared/environment.js";
import type { BrowserEnvironment } from "../shared/environment.js";
import type { CommittedAnnotation } from "../shared/types.js";
import type { AnnotationController } from "./controller.js";
import { annotationColor, annotationName } from "./appearance.js";
import { isFiniteNumber, readRangeNumber } from "../shared/numbers.js";

function createAnnotationRow(document: Document, id: string, onSelect: (id: string) => void) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "annotation-row";

    button.addEventListener("click", () => onSelect(id));

    const swatch = document.createElement("span");

    swatch.className = "annotation-swatch";
    swatch.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");

    text.className = "annotation-row-text";

    const name = document.createElement("span");
    const shape = document.createElement("small");

    text.append(name, shape);

    button.append(swatch, text);

    function update(annotation: CommittedAnnotation, selected: boolean) {
        button.setAttribute("aria-pressed", String(selected));
        swatch.style.backgroundColor = annotationColor(annotation);
        name.textContent = annotationName(annotation) || "Unnamed region";
        shape.textContent = annotation.shape.charAt(0).toUpperCase() + annotation.shape.slice(1).replaceAll("-", " ");
    }

    return { element: button, update };
}

export function createAnnotationPanel({
    env,
    controller,
}: {
    env: Pick<BrowserEnvironment, "document">;
    controller: Pick<
        AnnotationController,
        "annotations" | "selectAnnotation" | "updateAnnotation" | "deleteAnnotation" | "subscribe"
    >;
}) {
    const { document } = env;

    if (!document.getElementById("annotation-panel")) {
        return;
    }

    const panel = requiredElement(document, "annotation-panel", "aside");
    const toggle = requiredElement(document, "toggle-annotations", "button");
    const collapse = requiredElement(document, "collapse-annotations", "button");
    const list = requiredElement(document, "annotation-list", "div");
    const count = requiredElement(document, "annotation-count", "span");
    const empty = requiredElement(document, "annotation-empty", "p");
    const nameInput = requiredElement(document, "annotation-name", "input");
    const colorInput = requiredElement(document, "annotation-color", "input");
    const colorValue = requiredElement(document, "annotation-color-value", "output");
    const deleteButton = requiredElement(document, "delete-annotation", "button");
    const opacityInput = requiredElement(document, "annotation-opacity", "input");
    const opacityValue = requiredElement(document, "annotation-opacity-value", "output");
    const viewer = requiredElement(document, "image-viewer", "main");

    const teardown: (() => void)[] = [];

    function listen<K extends keyof HTMLElementEventMap>(
        target: HTMLElement,
        type: K,
        handler: (event: HTMLElementEventMap[K]) => void,
    ) {
        target.addEventListener(type, handler);
        teardown.push(() => target.removeEventListener(type, handler));
    }

    const rows = new Map<string, ReturnType<typeof createAnnotationRow>>();
    let selectedId: string | null = null;
    let notifiedSelection: string | null | undefined;

    function selectAnnotation(id: string) {
        selectedId = id;
        refresh();
    }

    function renderList(annotations: CommittedAnnotation[]) {
        count.textContent = String(annotations.length);
        empty.hidden = annotations.length > 0;

        const ids = new Set(annotations.map((annotation) => annotation.id));

        for (const [id, row] of rows) {
            if (!ids.has(id)) {
                row.element.remove();
                rows.delete(id);
            }
        }

        for (const annotation of annotations) {
            let row = rows.get(annotation.id);

            if (!row) {
                row = createAnnotationRow(document, annotation.id, selectAnnotation);
                rows.set(annotation.id, row);
                list.append(row.element);
            }

            row.update(annotation, annotation.id === selectedId);
        }
    }

    function renderEditor(selected: CommittedAnnotation | undefined) {
        nameInput.disabled = !selected;
        colorInput.disabled = !selected;
        deleteButton.disabled = !selected;

        nameInput.value = selected ? annotationName(selected) : "";
        colorInput.value = selected ? annotationColor(selected) : "#000000";
        colorValue.value = selected ? annotationColor(selected).toUpperCase() : "";
    }

    function refresh() {
        const annotations = controller.annotations;
        const selected = annotations.find((annotation) => annotation.id === selectedId) ?? annotations[0];

        selectedId = selected?.id ?? null;

        // The renderer only needs to hear about actual selection changes;
        // refresh() also runs on renames, recolors, and imports.
        if (selectedId !== notifiedSelection) {
            notifiedSelection = selectedId;
            controller.selectAnnotation(selectedId);
        }

        renderList(annotations);
        renderEditor(selected);
    }

    function setExpanded(expanded: boolean) {
        panel.hidden = !expanded;
        toggle.hidden = expanded;
        toggle.setAttribute("aria-expanded", String(expanded));
        (expanded ? collapse : toggle).focus();
    }

    listen(opacityInput, "input", () => {
        const value = readRangeNumber(opacityInput);

        if (!isFiniteNumber(value)) {
            return;
        }

        const percent = Math.max(0, Math.min(100, value));

        viewer.style.setProperty("--annotation-opacity", String(percent / 100));
        opacityValue.value = `${percent}%`;
        opacityInput.setAttribute("aria-valuetext", `${percent}%`);
    });
    listen(nameInput, "input", () => controller.updateAnnotation(selectedId, { name: nameInput.value }));
    listen(colorInput, "input", () => controller.updateAnnotation(selectedId, { color: colorInput.value }));
    listen(toggle, "click", () => setExpanded(true));
    listen(deleteButton, "click", () => {
        controller.deleteAnnotation(selectedId);

        if (deleteButton.disabled) {
            collapse.focus();
        }
    });
    listen(collapse, "click", () => setExpanded(false));
    listen(panel, "keydown", (event) => {
        if (event.key === "Escape") {
            setExpanded(false);
        }
    });

    const unsubscribe = controller.subscribe(refresh);

    refresh();

    return {
        dispose() {
            for (const removeListener of teardown) {
                removeListener();
            }

            unsubscribe();
        },
    };
}
