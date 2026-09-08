import assert from "node:assert/strict";
import test from "node:test";
import {createAnnotationStore} from "../plugins/a11e/js/annotations/annotation-store.js";

test("add owns its input and returns detached nested geometry with a generated ID", () => {
    const store = createAnnotationStore();
    const input = {id: "caller-id", shape: "polygon", points: [{x: 1, y: 2}]};
    const added = store.add(input);
    input.points[0].x = 90;
    input.points.push({x: 3, y: 4});
    added.points[0].y = 99;
    added.id = "replacement-id";
    assert.deepEqual(store.get("segmentation-1"), {
        id: "segmentation-1", shape: "polygon", points: [{x: 1, y: 2}],
    });

    const runs = [{y: 1, xStart: 2, xEnd: 3}];
    const mask = store.add({shape: "assisted-brush", runs});
    runs[0].xStart = 100;
    mask.runs[0].xEnd = 200;
    assert.deepEqual(store.get(mask.id).runs, [{y: 1, xStart: 2, xEnd: 3}]);
});

test("get and list snapshots cannot mutate stored annotations or membership", () => {
    const store = createAnnotationStore();
    const added = store.add({shape: "brush", radius: 4, points: [{x: 1, y: 2}]});
    const snapshot = store.list();
    snapshot[0].points[0].x = 40;
    snapshot.push({id: "injected"});
    store.get(added.id).points.pop();
    assert.deepEqual(store.list(), [added]);
    assert.equal(store.get("missing"), undefined);

    store.add({shape: "rectangle", x: 0, y: 0, width: 3, height: 4});
    assert.equal(snapshot.length, 2, "old snapshots do not track new state");
    assert.equal(snapshot[1].id, "injected");
});

test("update validates appearance and preserves identity and geometry", () => {
    const store = createAnnotationStore();
    const added = store.add({shape: "polygon", points: [{x: 1, y: 2}]});
    const updated = store.update(added.id, {
        name: "Tissue", color: "#aBc123", id: "override", shape: "circle",
        points: [{x: 90, y: 90}],
    });
    const expected = {...added, name: "Tissue", color: "#aBc123"};
    assert.deepEqual(updated, expected);
    updated.name = "Changed outside store";
    updated.points[0].x = 100;
    assert.deepEqual(store.get(added.id), expected);
    assert.deepEqual(store.update(added.id, {name: 12, color: "red"}), expected);
    assert.equal(store.update("missing", {name: "Missing"}), undefined);
    assert.equal(added.name, undefined, "previous snapshots remain unchanged");
});

test("remove and clear return removed snapshots and never recycle generated IDs", () => {
    const store = createAnnotationStore();
    const first = store.add({shape: "polygon", points: [{x: 1, y: 2}]});
    const second = store.add({shape: "polygon", points: [{x: 3, y: 4}]});
    assert.equal(store.remove("missing"), undefined);
    assert.deepEqual(store.remove(first.id), first);
    assert.equal(store.get(first.id), undefined);
    assert.deepEqual(store.list(), [second]);
    assert.deepEqual(store.clear(), [second]);
    assert.deepEqual(store.list(), []);
    assert.deepEqual(store.clear(), []);
    assert.equal(store.add({id: first.id, shape: "polygon", points: []}).id, "segmentation-3");
});
