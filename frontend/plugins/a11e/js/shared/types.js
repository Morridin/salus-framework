// Central JSDoc domain types for annotations.
// No runtime code — typedefs only — so it can be referenced for types
// from anywhere without import cycles. Reference via:
//   @param {import('../shared/types.js').Annotation} annotation
// From tools/core/* use ../../shared/types.js.

/**
 * @typedef {object} Point
 * @property {number} x image x
 * @property {number} y image y
 */

/**
 * @typedef {object} Bounds
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} Run
 * @property {number} y row index
 * @property {number} xStart inclusive start
 * @property {number} xEnd inclusive end
 */

/**
 * @typedef {object} BaseAnnotation
 * @property {string} [id] assigned on commit; absent on previews / new data
 * @property {string} [name]
 * @property {string} [color] hex, e.g. #2ecc71
 * @property {string} shape one of SHAPES values
 */

/**
 * @typedef {BaseAnnotation & Bounds & {shape: "rectangle"}} RectangleAnnotation
 */

/**
 * @typedef {BaseAnnotation & {shape: "circle", centerX: number, centerY: number, radius: number}} CircleAnnotation
 */

/**
 * @typedef {BaseAnnotation & {shape: "polygon", points: Point[]}} PolygonAnnotation
 */

/**
 * @typedef {BaseAnnotation & {shape: "brush", points: Point[], radius: number}} BrushAnnotation
 */

/**
 * @typedef {BaseAnnotation & {shape: "assisted-brush", runs: Run[], radius?: number, tolerance?: number}} AssistedBrushAnnotation
 */

/**
 * Committed or preview annotation. `id` is present once committed.
 *
 * @typedef {RectangleAnnotation | CircleAnnotation | PolygonAnnotation | BrushAnnotation | AssistedBrushAnnotation} Annotation
 */

export {};
