import assert from "node:assert/strict";
import test from "node:test";

import {
  annotationsToGeoJson,
  circleToGeoJsonFeature,
  polygonToGeoJsonFeature,
  rectangleToGeoJsonFeature,
} from "../plugins/a11e/js/geojson-export.js";

test("exports a free-brush annotation as a closed area", () => {
  const annotation = {
    id: "segmentation-1",
    shape: "brush",
    radius: 10,
    points: [
      {x: 20, y: 30},
      {x: 60, y: 30},
      {x: 60, y: 70},
    ],
  };

  const geoJson = annotationsToGeoJson([annotation]);
  const feature = geoJson.features[0];
  const polygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;

  assert.ok(["Polygon", "MultiPolygon"].includes(feature.geometry.type));
  assert.deepEqual(feature.properties, {
    objectType: "annotation",
    name: "segmentation-1",
    sourceTool: "brush",
  });
  for (const polygon of polygons) {
    for (const ring of polygon) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring.at(-1), ring[0]);
      for (const position of ring) {
        assert.ok(position.every(Number.isFinite));
      }
    }
  }
});

test("rejects unsupported annotation shapes", () => {
  assert.throws(
    () => annotationsToGeoJson([{
      id: "segmentation-1",
      shape: "unsupported",
    }]),
    /Unsupported annotation shape/,
  );
});

test("converts a polygon annotation to a GeoJSON feature", () => {
  const annotation = {
    id: "segmentation-1",
    shape: "polygon",
    points: [
      {x: 10, y: 20},
      {x: 80, y: 25},
      {x: 45, y: 90},
    ],
  };

  const feature = polygonToGeoJsonFeature(annotation);

  assert.deepEqual(feature, {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [10, 20],
        [80, 25],
        [45, 90],
        [10, 20],
      ]],
    },
    properties: {
      objectType: "annotation",
      name: "segmentation-1",
      sourceTool: "polygon",
    },
  });
});

test("converts a circle annotation to a QuPath-style GeoJSON feature", () => {
  const annotation = {
    id: "segmentation-1",
    shape: "circle",
    centerX: 100,
    centerY: 80,
    radius: 25,
  };

  const feature = circleToGeoJsonFeature(annotation);
  const ring = feature.geometry.coordinates[0];

  assert.equal(feature.type, "Feature");
  assert.equal(feature.geometry.type, "Polygon");
  assert.equal(feature.geometry.isEllipse, true);
  assert.equal(ring.length, 65);
  assert.deepEqual(ring[0], [125, 80]);
  assert.deepEqual(ring.at(-1), ring[0]);
  assert.deepEqual(feature.properties, {
    objectType: "annotation",
    name: "segmentation-1",
    sourceTool: "circle",
  });
});

test("converts a rectangle annotation to a GeoJSON feature", () => {
  const annotation = {
    id: "segmentation-1",
    shape: "rectangle",
    x: 10,
    y: 20,
    width: 70,
    height: 50,
  };

  const feature = rectangleToGeoJsonFeature(annotation);

  assert.deepEqual(feature, {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [10, 20],
          [80, 20],
          [80, 70],
          [10, 70],
          [10, 20],
        ],
      ],
    },
    properties: {
      objectType: "annotation",
      name: "segmentation-1",
      sourceTool: "rectangle",
    },
  });
});

test("wraps supported annotation features in a FeatureCollection", () => {
  const annotations = [
    {
      id: "segmentation-1",
      shape: "rectangle",
      x: 10,
      y: 20,
      width: 70,
      height: 50,
    },
    {
      id: "segmentation-2",
      shape: "circle",
      centerX: 100,
      centerY: 120,
      radius: 30,
    },
    {
      id: "segmentation-3",
      shape: "polygon",
      points: [
        {x: 20, y: 30},
        {x: 70, y: 35},
        {x: 40, y: 90},
      ],
    },
  ];

  const geoJson = annotationsToGeoJson(annotations);

  assert.deepEqual(geoJson, {
    type: "FeatureCollection",
    features: [
      rectangleToGeoJsonFeature(annotations[0]),
      circleToGeoJsonFeature(annotations[1]),
      polygonToGeoJsonFeature(annotations[2]),
    ],
  });
});
