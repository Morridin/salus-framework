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
