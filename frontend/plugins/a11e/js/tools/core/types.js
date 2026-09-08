// Tooling contracts for drawing tools. Typedefs only — no runtime — so
// function files stay logic-only. Reference via short alias:
//   /**
//    * @typedef {import('./types.js').Tool} Tool
//    */
//   @param {Tool} tool
// Domain geometry (Annotation, Point, Bounds) lives in
// ../../shared/types.js and is aliased below.

/**
 * @typedef {import('../../shared/types.js').Annotation} Annotation
 * @typedef {import('../../shared/types.js').Point} Point
 * @typedef {import('../../shared/types.js').Bounds} Bounds
 */

/**
 * @typedef {object} ToolSelection
 * @property {string} [tool] active tool id (defaults to current)
 * @property {unknown} [brushRadius] raw value; invalid keeps current
 * @property {unknown} [brushTolerance] raw value; invalid keeps current
 */

/**
 * @typedef {object} BrushSettings
 * @property {number} brushRadius
 * @property {number} brushTolerance
 */

/**
 * Canvas gesture / keyboard event forwarded to tools. Fields are optional
 * because press/drag/click/pointerMove/keyDown share one shape.
 *
 * @typedef {object} ViewerToolEvent
 * @property {{x: number, y: number}} [position] canvas pixel; convert via surface.toImagePoint
 * @property {{button?: number} & Record<string, unknown>} [originalEvent] native mouse event (stroke-tool checks button)
 * @property {boolean} [preventDefaultAction] set true to suppress viewer navigation
 * @property {boolean} [quick] OpenSeadragon click quick flag (polygon ignores non-quick)
 * @property {string} [key] keyboard key for keyDown
 * @property {() => void} [preventDefault] keyboard preventDefault for keyDown
 */

/**
 * @typedef {object} ViewerSurface
 * @property {(position: {x: number, y: number}) => {x: number, y: number}} toImagePoint
 * @property {(tagName: string) => HTMLElement} createElement
 * @property {(tagName: string) => SVGElement} createSvgElement
 * @property {(className: string) => SVGSVGElement} createSvgLayer
 * @property {(element: Element, bounds: Bounds) => void} addOverlay
 * @property {(element: Element, bounds: Bounds) => void} updateOverlay
 * @property {(element: Element) => void} removeOverlay
 */

/**
 * @typedef {object} AnnotationRenderer
 * @property {(shape: string) => boolean} canRender
 * @property {(annotation: Annotation, options?: {preview?: boolean}) => Element} render
 * @property {(element: Element, annotation: Annotation) => void} update
 * @property {(element: Element) => void} remove
 */

/**
 * @typedef {object} IntensitySampler
 * @property {boolean} ready
 * @property {Error | null} error
 * @property {(center: Point, radius: number, tolerance: number) => Point[]} select
 * @property {(url: string) => void} setImage
 */

/**
 * Event handlers a tool may implement. Cleanup discards an unfinished drawing.
 *
 * @typedef {object} Tool
 * @property {(event: ViewerToolEvent) => void} [press]
 * @property {(event: ViewerToolEvent) => void} [drag]
 * @property {(event: ViewerToolEvent) => void} [release]
 * @property {(event: ViewerToolEvent) => void} [click]
 * @property {(event: ViewerToolEvent) => void} [pointerMove]
 * @property {(event: ViewerToolEvent) => void} [keyDown]
 * @property {() => void} [deactivate]
 */

/**
 * Drawing dependencies. Brushes read settings at the start of each stroke;
 * the controller owns updates to those settings.
 *
 * @typedef {object} ToolContext
 * @property {ViewerSurface} surface coordinate conversion + SVG/overlay helpers
 * @property {AnnotationRenderer} renderer annotation rendering
 * @property {IntensitySampler} [sampler] intensity sampler (smart tools only)
 * @property {(annotationData: Annotation, preview?: Element | null) => Annotation} commitAnnotation
 * @property {(message: string) => void} [reportStatus]
 * @property {Readonly<BrushSettings>} [brushSettings]
 */

export {};
