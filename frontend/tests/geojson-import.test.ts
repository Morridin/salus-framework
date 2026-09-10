import { required } from "./helpers/assertions.js";
import type { Annotation } from "../plugins/a11e/src/shared/types.js";
import assert from "node:assert/strict";
import test from "node:test";
import { annotationsToGeoJson } from "../plugins/a11e/src/annotations/io/geojson-export.js";
import { annotationsFromGeoJson } from "../plugins/a11e/src/annotations/io/geojson-import.js";

const annotations: Annotation[] = [
    {
        id: "segmentation-1",
        shape: "rectangle" as const,
        x: 10,
        y: 20,
        width: 30,
        height: 40,
    },
    {
        id: "segmentation-2",
        shape: "circle" as const,
        centerX: 80,
        centerY: 60,
        radius: 15,
    },
    {
        id: "segmentation-3",
        shape: "polygon" as const,
        points: [
            { x: 5, y: 5 },
            { x: 25, y: 8 },
            { x: 12, y: 30 },
        ],
    },
    {
        id: "segmentation-4",
        shape: "brush" as const,
        radius: 6,
        points: [
            { x: 10, y: 10 },
            { x: 20, y: 15 },
        ],
    },
    {
        id: "segmentation-5",
        shape: "assisted-brush" as const,
        radius: 8,
        tolerance: 24,
        runs: [
            { y: 10, xStart: 5, xEnd: 8 },
            { y: 11, xStart: 4, xEnd: 9 },
        ],
    },
];

void test("round-trips every Salus annotation shape through GeoJSON", () => {
    const fileContents = JSON.stringify(annotationsToGeoJson(annotations));

    assert.deepEqual(annotationsFromGeoJson(fileContents), annotations);
});

void test("rejects unsupported Salus annotation versions", () => {
    const geoJson = annotationsToGeoJson([required(annotations[0])]);

    Object.assign(required(geoJson.features[0]).properties.salus, { version: 2 });

    assert.throws(() => annotationsFromGeoJson(JSON.stringify(geoJson)), /Unsupported Salus annotation version: 2/);
});

void test("rejects GeoJSON without Salus metadata", () => {
    const geoJson = annotationsToGeoJson([required(annotations[0])]);

    Object.assign(required(geoJson.features[0]), { properties: {} });

    assert.throws(() => annotationsFromGeoJson(JSON.stringify(geoJson)), /Salus metadata/);
});

void test("rejects malformed collections", () => {
    for (const value of [null, {}, { type: "FeatureCollection", features: {} }]) {
        assert.throws(() => annotationsFromGeoJson(JSON.stringify(value)), /FeatureCollection/);
    }
});

void test("rejects invalid annotation geometry before returning any annotations", () => {
    for (const annotation of [
        null,
        { shape: "unknown" as const },
        { ...required(annotations[0]), width: -1 },
        { ...required(annotations[1]), radius: null },
        { ...required(annotations[2]), points: [null, null, null] },
        { ...required(annotations[3]), points: [] },
        { ...required(annotations[4]), runs: [{ y: 1, xStart: 5, xEnd: 2 }] },
    ]) {
        const geoJson = annotationsToGeoJson(annotations);

        Object.assign(required(geoJson.features[1]).properties.salus, { annotation });

        assert.throws(() => annotationsFromGeoJson(JSON.stringify(geoJson)), /Invalid Salus annotation at feature 2/);
    }
});

void test("accepts an empty Salus export", () => {
    assert.deepEqual(annotationsFromGeoJson(JSON.stringify(annotationsToGeoJson([]))), []);
});

void test("rejects malformed appearance and assisted-brush metadata before import", () => {
    const rectangle = required(annotations[0]);
    const assistedBrush = required(annotations[4]);

    for (const annotation of [
        { ...rectangle, id: 12 },
        { ...rectangle, name: {} },
        { ...rectangle, color: false },
        { ...assistedBrush, radius: "12" },
        { ...assistedBrush, tolerance: -1 },
    ]) {
        const geoJson = annotationsToGeoJson(annotations);

        Object.assign(required(geoJson.features[1]).properties.salus, { annotation });

        assert.throws(() => annotationsFromGeoJson(JSON.stringify(geoJson)), /Invalid Salus annotation at feature 2/);
    }
});
