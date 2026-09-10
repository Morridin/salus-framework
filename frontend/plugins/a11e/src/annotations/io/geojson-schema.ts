import type { Annotation } from "../../shared/types.js";

/** Salus annotation version written to and required from GeoJSON files. */
export const SALUS_GEOJSON_VERSION = 1;

export interface AnnotationProperties {
    objectType: string;
    name: string | undefined;
    sourceTool: Annotation["shape"];
    salus: { version: typeof SALUS_GEOJSON_VERSION; annotation: Annotation };
}
