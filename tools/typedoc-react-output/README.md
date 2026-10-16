# @sinterdb/typedoc-react-output

A TypeDoc plugin that writes an API reference as Next.js App Router pages:
one page per export, an index, an inheritance tree, and the React components
to render them. The pages are plain TSX with the data inlined, so the site
builds them like any other route.

Used by `tools/api-docs` to generate `apps/website/src/app/docs/api`.

## Setup

```json
{
  "$schema": "https://sinterdb.vercel.app/typedoc/react-output/schema.json",
  "plugin": ["@sinterdb/typedoc-react-output"],
  "outputs": [
    { "name": "react", "path": "../../apps/website/src/app/docs/api" }
  ],
  "reactOutput": {
    "routeBase": "/docs/api",
    "components": { "overrides": "../../apps/website/src/api-theme" }
  }
}
```

Every option is described in the [JSON schema](https://sinterdb.vercel.app/typedoc/react-output/schema.json), which also gives editors autocomplete in `typedoc.json`. Its source is `apps/website/public/typedoc/react-output/schema.json`.

## What the pages include

- Signatures with linked types, and a preview of the type on hover.
- Search over every page and member: ⌘K, Ctrl+K or `/`. The index is a
  separate chunk loaded on first use.
- **Used by**: on a type's page, the pages and members whose signatures
  mention it.
- **Deprecations**: anything deprecated, or pointing at something deprecated,
  is struck through with the reason on hover. That covers sidebar entries,
  type links, doc-comment links and the "On this page" list. Members of a
  deprecated class count too, as do functions whose every overload is
  deprecated. The index page lists them all.
- **`@since`**: a version badge on pages and members, and a "New in" list on
  the index page for the newest version.
- Copy buttons on code blocks, previous/next links, and source links. Source
  links point at the release tag when the current commit is tagged, and at
  `main` otherwise.

## Customizing the theme

The theme in `src/themes/default` is copied into the output on every run.
To change a file, put your own version in the `components.overrides` folder
under the same name. It is copied on top of the theme, and `cleanOutput`
never deletes it.

Colors and sizes are CSS custom properties on `.tdk-root` in `api.css`, so
small changes can be an override of that file alone.

## Tests

```bash
pnpm --filter @sinterdb/typedoc-react-output test
```

The tests run TypeDoc on the fixtures in `test/fixtures` and check the
generated data, including that it type-checks with and without
deprecations.
