# Image viewer plugin

`index.html` loads `js/main.js`, which connects the viewer, annotations, drawing
tools, and toolbar. `plugin.json` is the Salus manifest; `main.css` and `sample.svg`
are the plugin's stylesheet and sample image.

## JavaScript layout

```text
js/
├── main.js                  # Application entry point and composition
├── annotations/             # Annotation workflows, state, and rendering
├── viewer/                  # OpenSeadragon setup and coordinate/overlay adapter
├── toolbar/                 # Communication with the toolbar plugin (5e61)
└── tools/                   # Tool controller and drawing implementations
    └── assisted-brush/      # Assisted brush tool and intensity sampling
```

Keep new drawing tools in `js/tools/` and connect them through
`js/tools/tool-controller.js`. Annotation persistence and rendering belong in
`js/annotations/`, alongside GeoJSON import and export.
Viewer-specific operations belong in `js/viewer/`.

Commit finished annotations through the annotation controller's
`commitAnnotation(data, preview)`. Drawing tools pass their preview element;
imports omit it. The controller stores the annotation, finalizes the preview or
renders a new element, then publishes and notifies subscribers. Tools only render,
update, and remove temporary previews directly.

## Tests

From the repository root:

```sh
npm ci --prefix frontend/plugins/a11e
node --test frontend/tests/*.test.js
```

The tests remain in `frontend/tests/` because they also cover integration with
the separate toolbar plugin.
