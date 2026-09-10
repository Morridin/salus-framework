import type { PolygonAnnotation } from "../plugins/a11e/src/shared/types.js";
import { required, shape } from "./helpers/assertions.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createAnnotationStore } from "../plugins/a11e/src/annotations/store.js";

void test("add owns its input and returns detached nested geometry with a generated ID", () => {
    const store = createAnnotationStore();
    const input: PolygonAnnotation = { id: "caller-id", shape: "polygon" as const, points: [{ x: 1, y: 2 }] };
    const added = store.add(input);

    required(input.points[0]).x = 90;
    input.points.push({ x: 3, y: 4 });
    required(shape(added, "polygon").points[0]).y = 99;
    added.id = "replacement-id";

    assert.deepEqual(store.get("segmentation-1"), {
        id: "segmentation-1",
        shape: "polygon" as const,
        points: [{ x: 1, y: 2 }],
    });

    const runs = [{ y: 1, xStart: 2, xEnd: 3 }];
    const mask = store.add({ shape: "assisted-brush" as const, runs });

    required(runs[0]).xStart = 100;
    required(shape(mask, "assisted-brush").runs[0]).xEnd = 200;

    assert.deepEqual(shape(store.get(mask.id), "assisted-brush").runs, [{ y: 1, xStart: 2, xEnd: 3 }]);
});

void test("get and list snapshots cannot mutate stored annotations or membership", () => {
    const store = createAnnotationStore();
    const added = store.add({ shape: "brush" as const, radius: 4, points: [{ x: 1, y: 2 }] });
    const snapshot = store.list();

    required(shape(required(snapshot[0]), "brush").points[0]).x = 40;
    snapshot.push({ ...added, id: "injected" });
    shape(store.get(added.id), "brush").points.pop();

    assert.deepEqual(store.list(), [added]);
    assert.equal(store.get("missing"), undefined);

    store.add({ shape: "rectangle" as const, x: 0, y: 0, width: 3, height: 4 });

    assert.equal(snapshot.length, 2, "old snapshots do not track new state");
    assert.equal(required(snapshot[1]).id, "injected");
});

void test("update validates appearance and preserves identity and geometry", () => {
    const store = createAnnotationStore();
    const added = store.add({ shape: "polygon" as const, points: [{ x: 1, y: 2 }] });
    const changes = {
        name: "Tissue",
        color: "#aBc123",
        id: "override",
        shape: "circle" as const,
        points: [{ x: 90, y: 90 }],
    };
    const updated = required(store.update(added.id, changes));
    const expected = { ...added, name: "Tissue", color: "#aBc123" };

    assert.deepEqual(updated, expected);

    updated.name = "Changed outside store";
    required(shape(updated, "polygon").points[0]).x = 100;

    assert.deepEqual(store.get(added.id), expected);
    assert.deepEqual(store.update(added.id, { name: 12, color: "red" }), expected);
    assert.equal(store.update("missing", { name: "Missing" }), undefined);
    assert.equal(added.name, undefined, "previous snapshots remain unchanged");
});

void test("remove and clear return removed snapshots and never recycle generated IDs", () => {
    const store = createAnnotationStore();
    const first = store.add({ shape: "polygon" as const, points: [{ x: 1, y: 2 }] });
    const second = store.add({ shape: "polygon" as const, points: [{ x: 3, y: 4 }] });

    assert.equal(store.remove("missing"), undefined);
    assert.deepEqual(store.remove(first.id), first);
    assert.equal(store.get(first.id), undefined);
    assert.deepEqual(store.list(), [second]);
    assert.deepEqual(store.clear(), [second]);
    assert.deepEqual(store.list(), []);
    assert.deepEqual(store.clear(), []);
    assert.equal(store.add({ id: first.id, shape: "polygon" as const, points: [] }).id, "segmentation-3");
});
