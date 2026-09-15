import type { BrowserEnvironment } from "../shared/environment.js";
import type { AnnotationSummary } from "../shared/types.js";
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

    function update(annotation: AnnotationSummary, selected: boolean) {
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
        "categories" | "summaries" | "selectAnnotation" | "updateAnnotation" | "deleteAnnotation" | "subscribe"
    >;
}) {
    const { document } = env;

    if (!document.getElementById("annotation-panel")) {
        return;
    }

    const panel = document.querySelector<HTMLElement>("#annotation-panel")!;
    const toggle = document.querySelector<HTMLButtonElement>("#toggle-annotations")!;
    const collapse = document.querySelector<HTMLButtonElement>("#collapse-annotations")!;
    const list = document.querySelector<HTMLDivElement>("#annotation-list")!;
    const count = document.querySelector<HTMLSpanElement>("#annotation-count")!;
    const empty = document.querySelector<HTMLParagraphElement>("#annotation-empty")!;
    const nameInput = document.querySelector<HTMLInputElement>("#annotation-name")!;
    const categoryInput = document.querySelector<HTMLSelectElement>("#annotation-category")!;
    const colorInput = document.querySelector<HTMLInputElement>("#annotation-color")!;
    const colorValue = document.querySelector<HTMLOutputElement>("#annotation-color-value")!;
    const deleteButton = document.querySelector<HTMLButtonElement>("#delete-annotation")!;
    const opacityInput = document.querySelector<HTMLInputElement>("#annotation-opacity")!;
    const opacityValue = document.querySelector<HTMLOutputElement>("#annotation-opacity-value")!;
    const viewer = document.querySelector<HTMLElement>("#image-viewer")!;

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

    function renderList(summaries: readonly AnnotationSummary[]) {
        count.textContent = String(summaries.length);
        empty.hidden = summaries.length > 0;

        const ids = new Set(summaries.map((annotation) => annotation.id));

        for (const [id, row] of rows) {
            if (!ids.has(id)) {
                row.element.remove();
                rows.delete(id);
            }
        }

        for (const annotation of summaries) {
            let row = rows.get(annotation.id);

            if (!row) {
                row = createAnnotationRow(document, annotation.id, selectAnnotation);
                rows.set(annotation.id, row);
                list.append(row.element);
            }

            row.update(annotation, annotation.id === selectedId);
        }
    }

    function renderEditor(selected: AnnotationSummary | undefined) {
        nameInput.disabled = !selected;
        colorInput.disabled = !selected || !!selected.category;
        categoryInput.disabled = !selected;

        const options = [{ id: "", name: "Uncategorized" }, ...controller.categories].map((category) => {
            const option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            return option;
        });

        categoryInput.replaceChildren(...options);
        categoryInput.value = selected?.category?.id ?? "";
        deleteButton.disabled = !selected;

        nameInput.value = selected ? annotationName(selected) : "";
        colorInput.value = selected ? annotationColor(selected) : "#000000";
        colorValue.value = selected ? annotationColor(selected).toUpperCase() : "";
    }

    function refresh() {
        const summaries = controller.summaries;
        const selected = summaries.find((annotation) => annotation.id === selectedId) ?? summaries[0];

        selectedId = selected?.id ?? null;

        // The renderer only needs to hear about actual selection changes;
        // refresh() also runs on renames, recolors, and imports.
        if (selectedId !== notifiedSelection) {
            notifiedSelection = selectedId;
            controller.selectAnnotation(selectedId);
        }

        renderList(summaries);
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
    listen(categoryInput, "change", () =>
        controller.updateAnnotation(selectedId, {
            category: controller.categories.find((category) => category.id === categoryInput.value) ?? null,
        }),
    );
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
