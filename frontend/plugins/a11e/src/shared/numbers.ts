// Strict numeric helpers shared by toolbar messages, GeoJSON validation,
// and range-input parsing. Imported values cross trust boundaries
// (postMessage payloads, files, DOM strings), so these helpers never coerce:
// non-number types are rejected instead of Number("") === 0 style surprises.
export function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveFinite(value: unknown): value is number {
    return isFiniteNumber(value) && value > 0;
}

// Range inputs expose valueAsNumber; fall back to parsing .value so empty
// strings become NaN instead of Number("") === 0.
export function readRangeNumber(input: Pick<HTMLInputElement, "value" | "valueAsNumber">): number {
    if (Number.isFinite(input.valueAsNumber)) {
        return input.valueAsNumber;
    }

    const text = input.value;

    if (text.trim() === "") {
        return NaN;
    }

    return Number(text);
}
