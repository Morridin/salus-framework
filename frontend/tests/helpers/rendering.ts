import type { AnnotationElement, ViewerSurface } from "../../plugins/a11e/src/tools/core/types.js";

export class FakeElement implements AnnotationElement {
    attributes = new Map<string, string>();

    style = new (class extends Map<string, string> {
        setProperty(name: string, value: string) {
            this.set(name, value);
        }
    })();

    children: FakeElement[] = [];

    classes = new Set<string>();

    dataset: DOMStringMap = {};

    removed = false;

    className = "";

    parent: FakeElement | null = null;

    classList = {
        add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
        remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    };

    constructor(public tagName = "div") {}

    append(element: FakeElement) {
        this.children.push(element);
        element.parent = this;
    }

    setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
    }

    remove() {
        this.removed = true;
    }
}

export function fakeSurface(overrides: Partial<ViewerSurface<FakeElement>> = {}): ViewerSurface<FakeElement> {
    return {
        toImagePoint: (point) => point,
        createElement: (tag) => new FakeElement(tag),
        createSvgElement: (tag) => new FakeElement(tag),
        createSvgLayer: () => new FakeElement("svg"),
        addOverlay() {},
        updateOverlay() {},
        removeOverlay() {},
        ...overrides,
    };
}
