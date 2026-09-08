# JavaScript quality guide

Researched and checked against this working tree on 2026-09-08. Scope: the
`a11e` viewer, `5e61` toolbar, and `frontend/tests`; generated Rust documentation
and third-party dependencies are outside the review.

## Assessment

The viewer already separates composition, annotation state, rendering, drawing
tools, and viewer integration. Its initial 51 tests passed. Preserve these
boundaries and behavior tests while improving specific weaknesses. A framework
rewrite is not justified by the code inspected.

The first improvement is a repeatable lint check. `eslint.config.mjs` applies
ESLint's recommended correctness rules, strict equality, `prefer-const`, and
`no-var` to both plugins and their tests. Browser and Node globals are scoped
separately. Unused fields intentionally excluded with object rest are permitted.
CI runs lint with zero warnings allowed. These checks catch a useful class of
mistakes; they do not prove correct application behavior or architecture.

## Run the checks

Use Node.js 24 (also selected in CI). From the repository root:

```sh
npm ci --prefix frontend
npm ci --prefix frontend/plugins/a11e
npm run check --prefix frontend
```

The first install provides development tools; the second provides the viewer's
existing Turf dependencies. Both use committed lockfiles. `npm run lint --prefix
frontend` and `npm test --prefix frontend` are available separately.

## Practices to apply

1. **Automate correctness checks.** Keep one shared ESLint configuration and run
   it locally and in CI. Use the recommended rules as a baseline and add rules
   for observed failure patterns, rather than enabling every rule. See
   [ESLint configuration](https://eslint.org/docs/latest/use/configure/configuration-files).

2. **Keep formatting separate from correctness.** Existing files mix two- and
   four-space indentation. Adopt Prettier in a dedicated formatting change if
   consistent formatting is desired; review that separately from behavioral
   refactoring. Prettier's documentation distinguishes formatter responsibilities
   from lint rules. See
   [Prettier and linters](https://prettier.io/docs/integrating-with-linters).

3. **Keep responsibilities explicit.** Continue using ES modules for viewer code;
   keep `main.js` focused on wiring dependencies. Geometry conversion should
   remain independent of the DOM, and tools should commit through the annotation
   controller. Prefer clear names and comments explaining intent. See
   [MDN modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
   and [MDN JavaScript style guidance](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/JavaScript).
   MDN's style page targets documentation examples; its style choices are not
   universal architectural requirements.

4. **Make asynchronous ownership explicit.** Handle failures where callers can
   recover or show a useful message. Decide whether overlapping operations may
   finish out of order. Do not turn failures into silent success. See
   [MDN promises](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises).

5. **Document data contracts incrementally.** Add shared JSDoc types for the five
   annotation shapes and the toolbar messages, then pilot `checkJs` on pure
   geometry modules. JavaScript can be type-checked without first converting the
   project to TypeScript. See [TypeScript checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html).

6. **Test observable failure behavior.** Keep `node:test` and the existing geometry
   and interaction tests. Add regression cases for actual bugs and use browser
   tests where mocks cannot establish real OpenSeadragon or file-decoding behavior.
   The existing test runner supports mocking and coverage; a new test framework
   is not a prerequisite. See [Node test runner](https://nodejs.org/api/test.html).

## Prioritized follow-up review

These are code observations and proposed investigations, not reproduced defects
or completed fixes:

| Priority | Location | Next improvement and validation |
| --- | --- | --- |
| High | `plugins/a11e/js/annotations/annotation-controller.js` | Imports await `file.text()` and then check only image readiness. Test switching images during the read; decide whether an import should be rejected when its originating image session has changed. |
| High | `plugins/a11e/js/annotations/annotation-controller.js` | `commitAnnotation` stores data before rendering and publishing. Test a renderer/publisher failure and define whether to roll back or preserve a committed annotation with a reported delivery failure. |
| Medium | `plugins/a11e/js/main.js`, `viewer/image-opener.js` | The app exposes no teardown method and discards the toolbar unsubscribe callback. If same-document remounting is supported, add disposal of subscriptions, viewer resources, and the last object URL; test repeated setup/disposal. |
| Medium | `plugins/a11e/js/annotations/`, `toolbar/toolbar-bridge.js` | Add JSDoc shape/message contracts and direct malformed-message tests. Keep runtime validation at import/message boundaries even after adding type checks. |
| Low | `tests/` | Tests mix ESM and CommonJS. Standardize in a separate change; Node currently detects ESM syntax and may report module-type warnings. |

Object URLs should be released once no longer needed; see
[MDN revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static).
Exact disposal timing depends on the viewer lifecycle.

## Available skills

The official curated catalog checked for this task has no general JavaScript
code-quality skill. Its
[security-best-practices skill](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md)
supports JavaScript, but explicitly targets security work rather than general
code review.

A community option is
[Jeffallan's javascript-pro](https://github.com/Jeffallan/claude-skills/blob/main/skills/javascript-pro/SKILL.md).
It covers JavaScript, modules, async flows, browser APIs, and performance. However,
its instructions require Jest and 85% coverage and impose blanket syntax and
callback restrictions. Those prescriptions are not a good default for this
repository. It was reviewed as a candidate, not installed or adopted. Prefer
this project-specific guide and executable checks; consider a tailored skill
later if the review workflow needs to be reused across repositories.
