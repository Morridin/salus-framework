export function createCategoryPanel(
    document: Document,
    sendCategory: (payload: PluginProtocol.ToolbarToViewerPayload) => void,
) {
    const categorySelect = document.querySelector<HTMLSelectElement>("#category-select")!;
    const categoryEditor = document.querySelector<HTMLFormElement>("#category-editor")!;
    const categoryName = document.querySelector<HTMLInputElement>("#category-name")!;
    const categoryColor = document.querySelector<HTMLInputElement>("#category-color")!;
    const categoryEdit = document.querySelector<HTMLButtonElement>("#category-edit")!;
    let categories: PluginProtocol.Category[] = [];
    let editingCategoryId: string | undefined;

    function categoryOption(name: string, id: string) {
        const option = document.createElement("option");

        option.textContent = name;
        option.value = id;

        return option;
    }

    function openCategoryEditor(id?: string) {
        editingCategoryId = id;

        const category = categories.find((item) => item.id === id);

        categoryName.value = category?.name ?? "";
        categoryColor.value = category?.color ?? "#2ecc71";
        categoryEditor.hidden = false;
        categoryName.focus();
    }

    document
        .querySelector<HTMLButtonElement>("#category-create")!
        .addEventListener("click", () => openCategoryEditor());
    categoryEdit.addEventListener("click", () => openCategoryEditor(categorySelect.value));
    document.querySelector<HTMLButtonElement>("#category-cancel")!.addEventListener("click", () => {
        categoryEditor.hidden = true;
        categorySelect.focus();
    });
    categorySelect.addEventListener("change", () =>
        sendCategory({ type: "category-select", id: categorySelect.value || null }),
    );
    categoryEditor.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!categoryName.value.trim()) {
            return;
        }

        const payload: Extract<PluginProtocol.ToolbarToViewerPayload, { type: "category-save" }> = {
            type: "category-save",
            name: categoryName.value.trim(),
            color: categoryColor.value,
        };

        if (editingCategoryId !== undefined) {
            payload.id = editingCategoryId;
        }

        sendCategory(payload);
        categoryEditor.hidden = true;
        categorySelect.focus();
    });

    function update(payload: Extract<PluginProtocol.ViewerToToolbarPayload<unknown>, { type: "categories-state" }>) {
        categories = payload.categories;
        categorySelect.replaceChildren(
            categoryOption("Uncategorized", ""),
            ...categories.map((category) => categoryOption(category.name, category.id)),
        );
        categorySelect.value = payload.activeCategoryId ?? "";
        categoryEdit.disabled = !categorySelect.value;
    }

    return { update };
}
