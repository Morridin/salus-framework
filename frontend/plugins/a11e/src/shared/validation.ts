/** External JSON and channel payloads stay unknown until validated. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
