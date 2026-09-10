# TypeScript readability

These guidelines apply to plugin source, tests, test helpers, and declaration files.

## Automated checks

From the repository root:

```sh
npm run format --prefix frontend       # Fix ESLint issues and format TypeScript
npm run lint --prefix frontend         # Check spacing, braces, and code quality
npm run format:check --prefix frontend # Check formatting without editing files
npm run check --prefix frontend        # Types, lint, formatting, build, and tests
```

The existing build workflow runs `check`, so spacing and formatting failures also
fail CI. Run `format` before committing and review its diff: ESLint can apply code
quality fixes as well as spacing fixes. An editor's Prettier integration handles
formatting, but ESLint fixes are also needed to insert missing blank lines.

## Layout rules enforced by tools

- Use four spaces, double quotes, semicolons, and trailing commas. Prettier wraps
  code with a target width of 120 columns; this is not a hard limit for strings.
- Keep consecutive imports together, followed by a blank line.
- Inside functions and callbacks, separate a group of `const`/`let` declarations
  from the surrounding operations with a blank line. Related declarations may
  stay together; split them when their purpose changes. This also applies at
  module scope.
- Separate function, class, interface, and type declarations from adjacent code
  with a blank line. Keep function overload signatures together.
  Exported declarations follow the same separation rule.
- Put a blank line before conditionals, loops, `switch`, `try`, and `return`
  statements, and after block-like statements. A block's first statement does not
  need a leading blank line. `else`, `catch`, and `finally` stay with their block.
- Separate class members with a blank line.
- Always use braces for conditionals and loops, including early returns.
- Use at most one blank line between code sections, with no blank padding inside
  the start or end of a block. Prettier normalizes this spacing.

For example:

```ts
function removeAnnotation(id: string | null) {
    const annotation = annotationStore.remove(id);

    if (!annotation) {
        return;
    }

    renderer.removeAnnotation(annotation.id);
    notify();

    return annotation;
}
```

Prettier owns indentation, wrapping, and horizontal spacing. ESLint Stylistic owns
required blank lines; avoid adding competing indentation or wrapping lint rules.
See the [Prettier options](https://prettier.io/docs/options) and
[ESLint Stylistic rules](https://eslint.style/rules) for tool details.

## Readability guidelines for review

Tools cannot reliably identify every meaningful phase of a function. Apply these
guidelines when editing code:

- Put imports at the top, preserving runtime import order. Follow with local
  types and constants, then the module's public functions and their helpers.
- Keep related declarations and operations together. Use a blank line when moving
  from setup to validation, mutation, rendering, or notification. In tests, make
  setup, action, and assertions easy to distinguish without labeling every line.
  Keep consecutive assertions together, and separate them from the next action.
  Keep consecutive assignments to the same object together. Separate configuring
  an object from registering its event handlers or publishing it.
- Give each function one clear responsibility. Extract a helper when a distinct
  operation has a useful name or is repeated; avoid helpers that only obscure a
  simple expression. Keep small private helpers near the code that uses them.
- Prefer early returns for invalid or unavailable inputs. Keep the normal path
  easy to follow, without deeply nested branches or nested ternaries.
- Use names that describe the domain and action, such as `selectedAnnotation`
  and `publishAnnotation`. Short loop indices are fine in small numerical loops.
- Express contracts with TypeScript types and use `import type` for type-only
  imports. Validate external values before using them; avoid `any` and assertions
  that bypass an actual check.
- Comment on intent, constraints, units, or ordering requirements. Avoid comments
  that repeat what the next line says. Name non-obvious constants.
- Keep side effects and their order visible. Do not mix unrelated behavior changes
  into a formatting pass; verify refactors with the relevant tests.

Generated plugin output and compiled tests are excluded from formatting. Edit the
TypeScript source and regenerate output with the build commands.
