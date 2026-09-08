import {isFiniteNumber, isPositiveFinite} from "../numbers.js";

function isPositiveNumber(value) {
  return isPositiveFinite(value);
}

function isValidPoint(point) {
  return isFiniteNumber(point?.x) && isFiniteNumber(point?.y);
}

function hasValidPoints(points, minimumCount) {
  if (!Array.isArray(points)) return false;
  if (points.length < minimumCount) return false;

  return points.every(isValidPoint);
}

function isValidRectangle({x, y, width, height}) {
  return (
    isFiniteNumber(x) &&
    isFiniteNumber(y) &&
    isPositiveNumber(width) &&
    isPositiveNumber(height)
  );
}

function isValidCircle({centerX, centerY, radius}) {
  return (
    isFiniteNumber(centerX) &&
    isFiniteNumber(centerY) &&
    isPositiveNumber(radius)
  );
}

function isValidRun(run) {
  if (!Number.isInteger(run?.y)) return false;
  if (!Number.isInteger(run?.xStart)) return false;
  if (!Number.isInteger(run?.xEnd)) return false;

  return run.xEnd >= run.xStart;
}

function hasValidRuns(runs) {
  if (!Array.isArray(runs)) return false;
  if (runs.length === 0) return false;

  return runs.every(isValidRun);
}

function hasValidGeometry(annotation) {
  switch (annotation?.shape) {
    case "rectangle":
      return isValidRectangle(annotation);
    case "circle":
      return isValidCircle(annotation);
    case "polygon":
      return hasValidPoints(annotation.points, 3);
    case "brush":
      return (
        hasValidPoints(annotation.points, 1) &&
        isPositiveNumber(annotation.radius)
      );
    case "assisted-brush":
      return hasValidRuns(annotation.runs);
    default:
      return false;
  }
}

export function annotationsFromGeoJson(fileContents) {
  const geoJson = JSON.parse(fileContents);

  if (geoJson?.type !== "FeatureCollection" || !Array.isArray(geoJson.features)) {
    throw new Error("Expected a Salus GeoJSON FeatureCollection.");
  }

  return geoJson.features.map((feature, index) => {
    if (feature?.type !== "Feature" || !feature.properties?.salus) {
      throw new Error("Only GeoJSON exports containing Salus metadata can be imported.");
    }

    const {version, annotation} = feature.properties.salus;

    if (version !== 1) {
      throw new Error(`Unsupported Salus annotation version: ${version}`);
    }

    if (!hasValidGeometry(annotation)) {
      throw new Error(`Invalid Salus annotation at feature ${index + 1}.`);
    }

    return annotation;
  });
}
