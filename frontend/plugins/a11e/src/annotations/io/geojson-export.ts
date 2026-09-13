import type { Feature, FeatureCollection, Polygon, MultiPolygon, Position } from "geojson";
import type {
    Annotation,
    Point,
    Run,
    RectangleAnnotation,
    CircleAnnotation,
    PolygonAnnotation,
    BrushAnnotation,
    AssistedBrushAnnotation,
} from "../../shared/types.js";
import { featureCollection, polygon } from "@turf/helpers";
import { union } from "@turf/union";
import { SHAPES } from "../../shared/types.js";
import { isPositiveFinite } from "../../shared/numbers.js";
import { SALUS_GEOJSON_VERSION } from "./geojson-schema.js";
import type { AnnotationProperties } from "./geojson-schema.js";

type AnnotationFeature = Feature<(Polygon & { isEllipse?: boolean }) | MultiPolygon, AnnotationProperties>;

const CIRCLE_POINT_COUNT = 64;

function annotationProperties(annotation: Annotation): AnnotationProperties {
    return {
        objectType: "annotation",
        name: annotation.name ?? annotation.id,
        sourceTool: annotation.shape,
        salus: {
            version: SALUS_GEOJSON_VERSION,
            annotation,
        },
    };
}

function circleToPolygonRing({
    centerX,
    centerY,
    radius,
}: Pick<CircleAnnotation, "centerX" | "centerY" | "radius">): Position[] {
    const points: Position[] = [];

    for (let index = 0; index < CIRCLE_POINT_COUNT; index += 1) {
        const angle = (2 * Math.PI * index) / CIRCLE_POINT_COUNT;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        points.push([x, y]);
    }

    const first = points[0];

    if (first) {
        points.push(first);
    }

    return points;
}

export function circleToGeoJsonFeature(annotation: CircleAnnotation): AnnotationFeature {
    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [circleToPolygonRing(annotation)],
            isEllipse: true,
        },
        properties: annotationProperties(annotation),
    };
}

function polygonToCoordinateRing(points: Point[]): Position[] {
    const coordinates: Position[] = [];

    for (const point of points) {
        coordinates.push([point.x, point.y]);
    }

    const first = coordinates[0];

    if (first) {
        coordinates.push(first);
    }

    return coordinates;
}

function singlePointRing(points: Point[], radius: number): Position[] {
    const first = points[0];

    if (!first) {
        throw new Error("A brush annotation requires at least one point.");
    }

    return circleToPolygonRing({
        centerX: first.x,
        centerY: first.y,
        radius,
    });
}

function brushToPolygonRing({ points, radius }: BrushAnnotation): Position[] {
    if (points.length === 0) {
        throw new Error("A brush annotation requires at least one point.");
    }

    if (!isPositiveFinite(radius)) {
        throw new Error("A brush annotation requires a positive radius.");
    }

    if (points.length === 1) {
        return singlePointRing(points, radius);
    }

    const leftEdge: Position[] = [];
    const rightEdge: Position[] = [];

    for (let index = 0; index < points.length; index += 1) {
        const previous = points[Math.max(0, index - 1)];
        const next = points[Math.min(points.length - 1, index + 1)];

        if (!previous || !next) {
            continue;
        }

        const dx = next.x - previous.x;
        const dy = next.y - previous.y;
        const length = Math.hypot(dx, dy);

        if (length === 0) {
            continue;
        }

        const normalX = (-dy / length) * radius;
        const normalY = (dx / length) * radius;
        const point = points[index];

        if (!point) {
            continue;
        }

        leftEdge.push([point.x + normalX, point.y + normalY]);
        rightEdge.push([point.x - normalX, point.y - normalY]);
    }

    if (leftEdge.length === 0) {
        return singlePointRing(points, radius);
    }

    const ring = [...leftEdge, ...rightEdge.reverse()];
    const first = ring[0];

    if (first) {
        ring.push(first);
    }

    return ring;
}

export function brushToGeoJsonFeature(annotation: BrushAnnotation): AnnotationFeature {
    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [brushToPolygonRing(annotation)],
        },
        properties: annotationProperties(annotation),
    };
}

function assistedBrushRunToFeature({ y, xStart, xEnd }: Run) {
    return polygon<Record<string, never>>([
        [
            [xStart, y],
            [xEnd + 1, y],
            [xEnd + 1, y + 1],
            [xStart, y + 1],
            [xStart, y],
        ],
    ]);
}

export function assistedBrushToGeoJsonFeature(annotation: AssistedBrushAnnotation): AnnotationFeature {
    const { runs } = annotation;

    if (runs.length === 0) {
        throw new Error("At least one assisted-brush run is required.");
    }

    const properties = annotationProperties(annotation);
    const runFeatures = runs.map(assistedBrushRunToFeature);

    if (runFeatures.length === 1) {
        const first = runFeatures[0];

        if (first) {
            return { ...first, properties };
        }
    }

    const merged = union(featureCollection(runFeatures), { properties });

    if (!merged) {
        throw new Error("The assisted-brush union is empty.");
    }

    return merged;
}

export function polygonToGeoJsonFeature(annotation: PolygonAnnotation): AnnotationFeature {
    const { points } = annotation;

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [polygonToCoordinateRing(points)],
        },
        properties: annotationProperties(annotation),
    };
}

export function rectangleToGeoJsonFeature(annotation: RectangleAnnotation): AnnotationFeature {
    const { x, y, width, height } = annotation;

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [
                [
                    [x, y],
                    [x + width, y],
                    [x + width, y + height],
                    [x, y + height],
                    [x, y],
                ],
            ],
        },
        properties: annotationProperties(annotation),
    };
}

function annotationToGeoJsonFeature(annotation: Annotation): AnnotationFeature {
    switch (annotation.shape) {
        case SHAPES.ASSISTED_BRUSH:
            return assistedBrushToGeoJsonFeature(annotation);
        case SHAPES.BRUSH:
            return brushToGeoJsonFeature(annotation);
        case SHAPES.CIRCLE:
            return circleToGeoJsonFeature(annotation);
        case SHAPES.POLYGON:
            return polygonToGeoJsonFeature(annotation);
        case SHAPES.RECTANGLE:
            return rectangleToGeoJsonFeature(annotation);
        default:
            throw new Error(`Unsupported annotation shape: ${String((annotation as { shape: unknown }).shape)}`);
    }
}

export function annotationsToGeoJson(
    annotations: readonly Annotation[],
): FeatureCollection<Polygon | MultiPolygon, AnnotationProperties> {
    const features = [];

    for (const annotation of annotations) {
        features.push(annotationToGeoJsonFeature(annotation));
    }

    return {
        type: "FeatureCollection",
        features,
    };
}
