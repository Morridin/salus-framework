# Plug-in directory (temporary location)

Put your plug-ins here during local development; each one gets its own subdirectory
containing at least a `plugin.json` manifest. Everything under this directory except this
file is ignored by git (see the root `.gitignore`) - it exists purely for local testing and
is not meant to be shipped.

This directory only exists to keep `frontend/src/components/plugin_panel.rs`'s
`asset!("/plugins/")` call resolvable, since that macro checks for the directory's presence
at compile time. It is going away once plug-in files are served from a separate,
unversioned `plugins/` directory at the repository root instead of through the front-end's
asset pipeline - see the `relocate-plugins` branch.