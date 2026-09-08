const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {pathToFileURL} = require("node:url");

const samplerModule = import(pathToFileURL(
    path.join(__dirname, "../plugins/a11e/js/tools/assisted-brush/sampler.js"),
));

function grayscaleImage(rows) {
    const height = rows.length;
    const width = rows[0].length;
    const data = new Uint8ClampedArray(width * height * 4);

    rows.flat().forEach((intensity, index) => {
        data[(index * 4)] = intensity;
        data[(index * 4) + 1] = intensity;
        data[(index * 4) + 2] = intensity;
        data[(index * 4) + 3] = 255;
    });

    return {data, width, height};
}

test("intensity selection stays in the connected similar region", async () => {
    const {selectConnectedRegion} = await samplerModule;
    const image = grayscaleImage([
        [20, 20, 100, 20, 20],
        [20, 20, 100, 20, 20],
        [20, 20, 100, 20, 20],
    ]);

    const pixels = selectConnectedRegion(
        image,
        {x: 0, y: 1},
        10,
        5,
    );

    assert.deepEqual(
        pixels.map(({x, y}) => `${x}:${y}`).sort(),
        ["0:0", "0:1", "0:2", "1:0", "1:1", "1:2"],
    );
});

test("intensity tolerance controls which neighboring pixels are accepted", async () => {
    const {selectConnectedRegion} = await samplerModule;
    const image = grayscaleImage([[40, 50, 70]]);

    assert.equal(
        selectConnectedRegion(image, {x: 0, y: 0}, 3, 15).length,
        2,
    );
    assert.equal(
        selectConnectedRegion(image, {x: 0, y: 0}, 3, 30).length,
        3,
    );
});

test("selected pixels are compacted into horizontal runs", async () => {
    const {pixelKeysToRuns} = await samplerModule;
    const runs = pixelKeysToRuns(new Set([
        "2:4", "2:5", "2:7", "1:3", "1:4",
    ]));

    assert.deepEqual(runs, [
        {y: 1, xStart: 3, xEnd: 4},
        {y: 2, xStart: 4, xEnd: 5},
        {y: 2, xStart: 7, xEnd: 7},
    ]);
});

test("changing images resets sampling and ignores late events from older images", async () => {
    const {createIntensitySampler} = await samplerModule;
    const images = [];
    const window = {Image: class {
        constructor() {
            this.listeners = new Map();
            this.naturalWidth = 2;
            this.naturalHeight = 1;
            images.push(this);
        }
        addEventListener(name, callback) { this.listeners.set(name, callback); }
    }};
    let pixels = grayscaleImage([[20, 20]]);
    const document = {createElement: () => ({getContext: () => ({
        drawImage() {},
        getImageData: () => pixels,
    })})};
    const sampler = createIntensitySampler({window, document, imageUrl: "first.png"});
    images[0].listeners.get("load")();
    assert.equal(sampler.select({x: 0, y: 0}, 3, 0).length, 2);

    sampler.setImage("second.png");
    assert.equal(sampler.ready, false);
    assert.equal(sampler.error, null);
    assert.deepEqual(sampler.select({x: 0, y: 0}, 3, 0), []);
    images[0].listeners.get("load")();
    images[0].listeners.get("error")();
    assert.equal(sampler.ready, false);
    assert.equal(sampler.error, null);

    pixels = grayscaleImage([[20, 100]]);
    images[1].listeners.get("load")();
    assert.equal(sampler.select({x: 0, y: 0}, 3, 0).length, 1);
    sampler.setImage("broken.png");
    images[2].listeners.get("error")();
    assert.ok(sampler.error);
    sampler.setImage("recovered.png");
    assert.equal(sampler.error, null);
    images[3].listeners.get("load")();
    assert.equal(sampler.ready, true);
});
