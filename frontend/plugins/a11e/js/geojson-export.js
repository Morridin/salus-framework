const CIRCLE_POINT_COUNT = 64;

function circleToPolygonRing({centerX, centerY, radius}) {
  const points = [];

  for (let index = 0; index < CIRCLE_POINT_COUNT; index += 1) {
    const angle = (2 * Math.PI * index) / CIRCLE_POINT_COUNT;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    points.push([x, y]);
  }

  points.push(points[0]);
  return points;
}

export function circleToGeoJsonFeature(annotation) {
  const {id} = annotation;

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [circleToPolygonRing(annotation)],
      isEllipse: true,
    },
    properties: {
      objectType: "annotation",
      name: id,
      sourceTool: "circle",
    },
  };
}

function polygonToCoordinateRing(points) {
  const coordinates = [];

  for (const point of points) {
    coordinates.push([point.x, point.y]);
  }

  coordinates.push(coordinates[0]);
  return coordinates;
}

function brushToPolygonRing({points, radius}) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("A brush annotation requires at least one point.");
  }

  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error("A brush annotation requires a positive radius.");
  }

  if (points.length === 1) {
    return circleToPolygonRing({
      centerX: points[0].x,
      centerY: points[0].y,
      radius,
    });
  }

  const leftEdge = [];
  const rightEdge = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) continue;

    const normalX = (-dy / length) * radius;
    const normalY = (dx / length) * radius;
    const point = points[index];
    leftEdge.push([point.x + normalX, point.y + normalY]);
    rightEdge.push([point.x - normalX, point.y - normalY]);
  }

  if (leftEdge.length === 0) {
    return circleToPolygonRing({
      centerX: points[0].x,
      centerY: points[0].y,
      radius,
    });
  }

  const ring = [...leftEdge, ...rightEdge.reverse()];
  ring.push(ring[0]);
  return ring;
}

export function brushToGeoJsonFeature(annotation) {
  const {id} = annotation;

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [brushToPolygonRing(annotation)],
    },
    properties: {
      objectType: "annotation",
      name: id,
      sourceTool: "brush",
    },
  };
}

export function polygonToGeoJsonFeature(annotation) {
  const {id, points} = annotation;

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [polygonToCoordinateRing(points)],
    },
    properties: {
      objectType: "annotation",
      name: id,
      sourceTool: "polygon",
    },
  };
}

export function rectangleToGeoJsonFeature(annotation) {
  const { id, x, y, width, height } = annotation;

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
    properties: {
      objectType: "annotation",
      name: id,
      sourceTool: "rectangle",
    },
  };
}

function annotationToGeoJsonFeature(annotation) {
  switch (annotation.shape) {
    case "brush":
      return brushToGeoJsonFeature(annotation);
    case "circle":
      return circleToGeoJsonFeature(annotation);
    case "polygon":
      return polygonToGeoJsonFeature(annotation);
    case "rectangle":
      return rectangleToGeoJsonFeature(annotation);
    default:
      throw new Error(`Unsupported annotation shape: ${annotation.shape}`);
  }
}

export function annotationsToGeoJson(annotations) {
  const features = [];

  for (const annotation of annotations) {
    features.push(annotationToGeoJsonFeature(annotation));
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
