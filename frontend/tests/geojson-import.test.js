import assert from "node:assert/strict";
import test from "node:test";

import {annotationsToGeoJson} from "../plugins/a11e/js/annotations/geojson-export.js";
import {annotationsFromGeoJson} from "../plugins/a11e/js/annotations/geojson-import.js";

const annotations = [
  {
    id: "segmentation-1",
    shape: "rectangle",
    x: 10,
    y: 20,
    width: 30,
    height: 40,
  },
  {
    id: "segmentation-2",
    shape: "circle",
    centerX: 80,
    centerY: 60,
    radius: 15,
  },
  {
    id: "segmentation-3",
    shape: "polygon",
    points: [
      {x: 5, y: 5},
      {x: 25, y: 8},
      {x: 12, y: 30},
    ],
  },
  {
    id: "segmentation-4",
    shape: "brush",
    radius: 6,
    points: [
      {x: 10, y: 10},
      {x: 20, y: 15},
    ],
  },
  {
    id: "segmentation-5",
    shape: "assisted-brush",
    radius: 8,
    tolerance: 24,
    runs: [
      {y: 10, xStart: 5, xEnd: 8},
      {y: 11, xStart: 4, xEnd: 9},
    ],
  },
];

test("round-trips every Salus annotation shape through GeoJSON", () => {
  const fileContents = JSON.stringify(annotationsToGeoJson(annotations));

  assert.deepEqual(annotationsFromGeoJson(fileContents), annotations);
});

test("rejects unsupported Salus annotation versions", () => {
  const geoJson = annotationsToGeoJson([annotations[0]]);
  geoJson.features[0].properties.salus.version = 2;

  assert.throws(
    () => annotationsFromGeoJson(JSON.stringify(geoJson)),
    /Unsupported Salus annotation version: 2/,
  );
});

test("rejects GeoJSON without Salus metadata", () => {
  const geoJson = annotationsToGeoJson([annotations[0]]);
  delete geoJson.features[0].properties.salus;
  assert.throws(() => annotationsFromGeoJson(JSON.stringify(geoJson)), /Salus metadata/);
});

test("rejects malformed collections", () => {
  for (const value of [null, {}, {type: "FeatureCollection", features: {}}]) {
    assert.throws(() => annotationsFromGeoJson(JSON.stringify(value)), /FeatureCollection/);
  }
});

test("rejects invalid annotation geometry before returning any annotations", () => {
  for (const annotation of [
    null,
    {shape: "unknown"},
    {...annotations[0], width: -1},
    {...annotations[1], radius: null},
    {...annotations[2], points: [null, null, null]},
    {...annotations[3], points: []},
    {...annotations[4], runs: [{y: 1, xStart: 5, xEnd: 2}]},
  ]) {
    const geoJson = annotationsToGeoJson(annotations);
    geoJson.features[1].properties.salus.annotation = annotation;
    assert.throws(() => annotationsFromGeoJson(JSON.stringify(geoJson)), /Invalid Salus annotation at feature 2/);
  }
});

test("accepts an empty Salus export", () => {
  assert.deepEqual(annotationsFromGeoJson(JSON.stringify(annotationsToGeoJson([]))), []);
});
