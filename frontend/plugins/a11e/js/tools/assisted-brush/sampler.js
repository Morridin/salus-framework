// Source-image loading and connected intensity selection.
function pixelLuminance(data, offset) {
    return (
        (0.2126 * data[offset]) +
        (0.7152 * data[offset + 1]) +
        (0.0722 * data[offset + 2])
    );
}

export function selectConnectedRegion(imageData, center, radius, tolerance) {
    const {data, width, height} = imageData;
    const seedX = Math.round(center.x);
    const seedY = Math.round(center.y);
    const safeRadius = Math.max(1, Math.round(radius));

    if (
        seedX < 0 || seedY < 0 || seedX >= width || seedY >= height
    ) {
        return [];
    }

    const minX = Math.max(0, seedX - safeRadius);
    const maxX = Math.min(width - 1, seedX + safeRadius);
    const minY = Math.max(0, seedY - safeRadius);
    const maxY = Math.min(height - 1, seedY + safeRadius);
    const regionWidth = maxX - minX + 1;
    const visited = new Uint8Array(regionWidth * (maxY - minY + 1));
    const radiusSquared = safeRadius * safeRadius;
    const seedIntensity = pixelLuminance(
        data,
        ((seedY * width) + seedX) * 4,
    );
    const accepted = [];
    const queue = [{x: seedX, y: seedY}];
    let queueIndex = 0;

    function localIndex(x, y) {
        return ((y - minY) * regionWidth) + (x - minX);
    }

    visited[localIndex(seedX, seedY)] = 1;

    while (queueIndex < queue.length) {
        const pixel = queue[queueIndex++];
        const offset = ((pixel.y * width) + pixel.x) * 4;
        const withinTolerance = Math.abs(
            pixelLuminance(data, offset) - seedIntensity,
        ) <= tolerance + 1e-6;

        if (!withinTolerance || data[offset + 3] === 0) continue;

        accepted.push(pixel);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = pixel.x + dx;
            const y = pixel.y + dy;
            if (x < minX || x > maxX || y < minY || y > maxY) continue;
            if (
                ((x - seedX) ** 2) + ((y - seedY) ** 2) > radiusSquared
            ) continue;

            const index = localIndex(x, y);
            if (visited[index]) continue;
            visited[index] = 1;
            queue.push({x, y});
        }
    }

    return accepted;
}

// Pixel keys are an internal encoding ("y:x") produced by the brush tool,
// so parsing here never faces external input.
function decodePixelKey(key) {
    const separator = key.indexOf(":");
    return {
        y: Number(key.slice(0, separator)),
        x: Number(key.slice(separator + 1)),
    };
}

export function pixelKeysToRuns(pixelKeys) {
    const rows = new Map();

    for (const key of pixelKeys) {
        const {y, x} = decodePixelKey(key);
        const row = rows.get(y) || [];
        row.push(x);
        rows.set(y, row);
    }

    const runs = [];
    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
        const xs = rows.get(y).sort((a, b) => a - b);
        let xStart = xs[0];
        let xEnd = xs[0];

        for (const x of xs.slice(1)) {
            if (x <= xEnd + 1) {
                xEnd = x;
            } else {
                runs.push({y, xStart, xEnd});
                xStart = x;
                xEnd = x;
            }
        }
        runs.push({y, xStart, xEnd});
    }

    return runs;
}

export function createIntensitySampler({window, document, imageUrl}) {
    let imageData = null;
    let failure = null;
    let currentImage = null;

    function setImage(url) {
        imageData = null;
        failure = null;
        currentImage = null;
        if (typeof window.Image !== "function") {
            failure = new Error("Image pixels are unavailable.");
            return;
        }

        const image = new window.Image();
        currentImage = image;
        image.crossOrigin = "anonymous";
        image.addEventListener("load", () => {
            if (image !== currentImage) return;
            try {
                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext("2d", {willReadFrequently: true});
                context.drawImage(image, 0, 0);
                imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            } catch (error) {
                failure = error;
            }
        });
        image.addEventListener("error", () => {
            if (image !== currentImage) return;
            failure = new Error("The source image could not be sampled.");
        });
        image.src = url;
    }

    setImage(imageUrl);

    return {
        setImage,
        get ready() { return imageData !== null; },
        get error() { return failure; },
        select(center, radius, tolerance) {
            return imageData
                ? selectConnectedRegion(imageData, center, radius, tolerance)
                : [];
        },
    };
}
