import assert from "node:assert/strict";
import type { Annotation, Shape } from "../../plugins/a11e/src/shared/types.js";

export function required<T>(value: T | null | undefined): T {
    assert.ok(value !== undefined && value !== null, "Expected a value to exist");

    return value;
}

export function shape<S extends Shape>(annotation: Annotation | undefined, kind: S): Extract<Annotation, { shape: S }> {
    assert.ok(annotation && annotation.shape === kind, `Expected ${kind} annotation`);

    // The runtime shape check establishes the requested member of the union.
    return annotation as Extract<Annotation, { shape: S }>;
}

/** Fixtures deliberately testing malformed runtime input still start as unknown. */
export function parseJson(text: string): unknown {
    const value: unknown = JSON.parse(text);

    return value;
}
