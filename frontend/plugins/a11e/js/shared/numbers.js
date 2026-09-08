// Strict numeric helpers shared by toolbar messages, GeoJSON validation,
// and range-input parsing. Imported values cross trust boundaries
// (postMessage payloads, files, DOM strings), so these helpers never coerce:
// non-number types yield NaN/null instead of Number("") === 0 style surprises.
export function asFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

export function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

export function isPositiveFinite(value) {
    return isFiniteNumber(value) && value > 0;
}

// Range inputs expose valueAsNumber; fall back to parsing .value so empty
// strings become NaN instead of Number("") === 0.
export function readRangeNumber(input) {
    if (typeof input?.valueAsNumber === "number" && Number.isFinite(input.valueAsNumber)) {
        return input.valueAsNumber;
    }
    const text = input?.value;
    if (typeof text !== "string" || text.trim() === "") return NaN;
    return Number(text);
}
