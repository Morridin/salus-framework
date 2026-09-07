import {annotationColor, annotationName} from "./annotation-appearance.js";

function createAnnotationRow(document, id, onSelect) {
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

    function update(annotation, selected) {
        button.setAttribute("aria-pressed", String(selected));
        swatch.style.backgroundColor = annotationColor(annotation);
        name.textContent = annotationName(annotation) || "Unnamed region";
        shape.textContent = annotation.shape.charAt(0).toUpperCase() +
            annotation.shape.slice(1).replaceAll("-", " ");
    }

    return {element: button, update};
}

export function createAnnotationPanel({document, controller}) {
    const panel = document.getElementById("annotation-panel");
    if (!panel) return;
    const toggle = document.getElementById("toggle-annotations");
    const collapse = document.getElementById("collapse-annotations");
    const list = document.getElementById("annotation-list");
    const count = document.getElementById("annotation-count");
    const empty = document.getElementById("annotation-empty");
    const nameInput = document.getElementById("annotation-name");
    const colorInput = document.getElementById("annotation-color");
    const colorValue = document.getElementById("annotation-color-value");
    const deleteButton = document.getElementById("delete-annotation");
    const rows = new Map();
    let selectedId = null;

    function selectAnnotation(id) {
        selectedId = id;
        refresh();
    }

    function renderList(annotations) {
        count.textContent = String(annotations.length);
        empty.hidden = annotations.length > 0;
        const ids = new Set(annotations.map(annotation => annotation.id));
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

    function renderEditor(selected) {
        nameInput.disabled = !selected;
        colorInput.disabled = !selected;
        deleteButton.disabled = !selected;
        nameInput.value = selected ? annotationName(selected) : "";
        colorInput.value = selected ? annotationColor(selected) : "#000000";
        colorValue.value = selected ? annotationColor(selected).toUpperCase() : "";
    }

    function refresh() {
        const annotations = controller.annotations;
        const selected = annotations.find(annotation => annotation.id === selectedId)
            ?? annotations[0];
        selectedId = selected?.id ?? null;
        controller.selectAnnotation(selectedId);

        renderList(annotations);
        renderEditor(selected);
    }

    function setExpanded(expanded) {
        panel.hidden = !expanded;
        toggle.hidden = expanded;
        toggle.setAttribute("aria-expanded", String(expanded));
        (expanded ? collapse : toggle).focus();
    }

    nameInput.addEventListener("input", () => {
        controller.updateAnnotation(selectedId, {name: nameInput.value});
    });
    colorInput.addEventListener("input", () => {
        controller.updateAnnotation(selectedId, {color: colorInput.value});
    });
    toggle.addEventListener("click", () => setExpanded(true));
    deleteButton.addEventListener("click", () => {
        controller.deleteAnnotation(selectedId);
        if (deleteButton.disabled) collapse.focus();
    });
    collapse.addEventListener("click", () => setExpanded(false));
    panel.addEventListener("keydown", event => {
        if (event.key === "Escape") setExpanded(false);
    });

    controller.subscribe(refresh);
    refresh();
}
