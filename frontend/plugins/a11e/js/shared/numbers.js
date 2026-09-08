// Strict numeric helpers shared by toolbar messages, GeoJSON validation,
// and range-input parsing. Imported values cross trust boundaries
// (postMessage payloads, files, DOM strings), so these helpers never coerce:
// non-number types yield NaN/null instead of Number("") === 0 style surprises.
/**
 * @param {unknown} value raw value from trust boundary
 * @returns {number} finite number or NaN
 */
export function asFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

/**
 * @param {unknown} value raw value from trust boundary
 * @returns {value is number} true only for finite numbers
 */
export function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {unknown} value raw value from trust boundary
 * @returns {value is number} true only for finite numbers > 0
 */
export function isPositiveFinite(value) {
    return isFiniteNumber(value) && value > 0;
}

// Range inputs expose valueAsNumber; fall back to parsing .value so empty
// strings become NaN instead of Number("") === 0.
/**
 * @param {HTMLInputElement} input range input
 * @returns {number} numeric value or NaN
 */
export function readRangeNumber(input) {
    if (typeof input?.valueAsNumber === "number" && Number.isFinite(input.valueAsNumber)) {
        return input.valueAsNumber;
    }
    const text = input?.value;
    if (typeof text !== "string" || text.trim() === "") return NaN;
    return Number(text);
}
