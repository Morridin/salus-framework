import { isFiniteNumber, isPositiveFinite } from "../../shared/numbers.js";
import { isRecord, isUnknownArray } from "../../shared/validation.js";
import { SALUS_GEOJSON_VERSION } from "./geojson-schema.js";
import type { Annotation, Point, Run } from "../../shared/types.js";

function isValidPoint(point: unknown): point is Point {
    return isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y);
}

function hasValidPoints(points: unknown, minimumCount: number): points is Point[] {
    return isUnknownArray(points) && points.length >= minimumCount && points.every(isValidPoint);
}

function isValidRun(run: unknown): run is Run {
    return (
        isRecord(run) &&
        isFiniteNumber(run.y) &&
        Number.isInteger(run.y) &&
        isFiniteNumber(run.xStart) &&
        Number.isInteger(run.xStart) &&
        isFiniteNumber(run.xEnd) &&
        Number.isInteger(run.xEnd) &&
        run.xEnd >= run.xStart
    );
}

function isAnnotation(annotation: unknown): annotation is Annotation {
    if (!isRecord(annotation)) {
        return false;
    }

    for (const key of ["id", "name", "color"]) {
        if (annotation[key] !== undefined && typeof annotation[key] !== "string") {
            return false;
        }
    }

    switch (annotation.shape) {
        case "rectangle":
            return (
                isFiniteNumber(annotation.x) &&
                isFiniteNumber(annotation.y) &&
                isPositiveFinite(annotation.width) &&
                isPositiveFinite(annotation.height)
            );
        case "circle":
            return (
                isFiniteNumber(annotation.centerX) &&
                isFiniteNumber(annotation.centerY) &&
                isPositiveFinite(annotation.radius)
            );
        case "polygon":
            return hasValidPoints(annotation.points, 3);
        case "brush":
            return hasValidPoints(annotation.points, 1) && isPositiveFinite(annotation.radius);
        case "assisted-brush":
            return (
                isUnknownArray(annotation.runs) &&
                annotation.runs.length > 0 &&
                annotation.runs.every(isValidRun) &&
                (annotation.radius === undefined || isPositiveFinite(annotation.radius)) &&
                (annotation.tolerance === undefined ||
                    (isFiniteNumber(annotation.tolerance) && annotation.tolerance >= 0))
            );
        default:
            return false;
    }
}

export function annotationsFromGeoJson(fileContents: string): Annotation[] {
    const geoJson: unknown = JSON.parse(fileContents);

    if (!isRecord(geoJson) || geoJson.type !== "FeatureCollection" || !isUnknownArray(geoJson.features)) {
        throw new Error("Expected a Salus GeoJSON FeatureCollection.");
    }

    return geoJson.features.map((feature, index) => {
        if (
            !isRecord(feature) ||
            feature.type !== "Feature" ||
            !isRecord(feature.properties) ||
            !isRecord(feature.properties.salus)
        ) {
            throw new Error("Only GeoJSON exports containing Salus metadata can be imported.");
        }

        const { version, annotation } = feature.properties.salus;

        if (version !== SALUS_GEOJSON_VERSION) {
            throw new Error(`Unsupported Salus annotation version: ${String(version)}`);
        }

        if (!isAnnotation(annotation)) {
            throw new Error(`Invalid Salus annotation at feature ${index + 1}.`);
        }

        return annotation;
    });
}
