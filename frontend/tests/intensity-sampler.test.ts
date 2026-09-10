import { createDom } from "./helpers/dom.js";
import { required } from "./helpers/assertions.js";
import assert from "node:assert/strict";
import test from "node:test";

const samplerModule = import("../plugins/a11e/src/tools/assisted-brush/sampler.js");

function grayscaleImage(rows: number[][]) {
    const height = rows.length;
    const width = required(rows[0]).length;
    const data = new Uint8ClampedArray(width * height * 4);

    rows.flat().forEach((intensity, index) => {
        data[index * 4] = intensity;
        data[index * 4 + 1] = intensity;
        data[index * 4 + 2] = intensity;
        data[index * 4 + 3] = 255;
    });

    return { data, width, height };
}

void test("intensity selection stays in the connected similar region", async () => {
    const { selectConnectedRegion } = await samplerModule;
    const image = grayscaleImage([
        [20, 20, 100, 20, 20],
        [20, 20, 100, 20, 20],
        [20, 20, 100, 20, 20],
    ]);

    const pixels = selectConnectedRegion(image, { x: 0, y: 1 }, 10, 5);

    assert.deepEqual(pixels.map(({ x, y }) => `${x}:${y}`).sort(), ["0:0", "0:1", "0:2", "1:0", "1:1", "1:2"]);
});

void test("intensity tolerance controls which neighboring pixels are accepted", async () => {
    const { selectConnectedRegion } = await samplerModule;
    const image = grayscaleImage([[40, 50, 70]]);

    assert.equal(selectConnectedRegion(image, { x: 0, y: 0 }, 3, 15).length, 2);
    assert.equal(selectConnectedRegion(image, { x: 0, y: 0 }, 3, 30).length, 3);
});

void test("selected pixels are compacted into horizontal runs", async () => {
    const { pixelKeysToRuns } = await samplerModule;
    const runs = pixelKeysToRuns(new Set(["2:4", "2:5", "2:7", "1:3", "1:4"]));

    assert.deepEqual(runs, [
        { y: 1, xStart: 3, xEnd: 4 },
        { y: 2, xStart: 4, xEnd: 5 },
        { y: 2, xStart: 7, xEnd: 7 },
    ]);
});

void test("changing images resets sampling and ignores late events from older images", async () => {
    const { createIntensitySampler } = await samplerModule;
    const env = createDom();
    const images: HTMLImageElement[] = [];

    env.window.Image = env.imageConstructor((image) => {
        Object.defineProperties(image, { naturalWidth: { value: 2 }, naturalHeight: { value: 1 } });
        images.push(image);
    });

    let pixels = grayscaleImage([[20, 20]]);

    Object.defineProperty(env.dom.window.HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value: () => ({ drawImage() {}, getImageData: () => ({ ...pixels, colorSpace: "srgb" }) }),
    });

    const sampler = createIntensitySampler({
        env,
        session: { imageUrl: "first.png" },
    });

    env.fire(required(images[0]), "load");

    assert.equal(sampler.select({ x: 0, y: 0 }, 3, 0).length, 2);

    sampler.setImage("second.png");

    assert.equal(sampler.ready, false);
    assert.equal(sampler.error, null);
    assert.deepEqual(sampler.select({ x: 0, y: 0 }, 3, 0), []);

    env.fire(required(images[0]), "load");
    env.fire(required(images[0]), "error");

    assert.equal(sampler.ready, false);
    assert.equal(sampler.error, null);

    pixels = grayscaleImage([[20, 100]]);
    env.fire(required(images[1]), "load");

    assert.equal(sampler.select({ x: 0, y: 0 }, 3, 0).length, 1);

    sampler.setImage("broken.png");
    env.fire(required(images[2]), "error");

    assert.ok(sampler.error);

    sampler.setImage("recovered.png");

    assert.equal(sampler.error, null);

    env.fire(required(images[3]), "load");

    assert.equal(sampler.ready, true);
});
