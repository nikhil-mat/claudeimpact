# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Data

Wards, roads and repair work orders in the Citizen view come from the
[Claude Impact Lab Mumbai dataset](https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2)
(CC BY 4.0). That data is **synthetic**: it is not BMC data and all contractors are fictional.

`src/data/civic.json` is generated from it:

```sh
git clone https://github.com/SumeetGDoshi/Claude-Impact-Labs-data-2 ../Claude-Impact-Labs-data-2
node scripts/build-data.mjs ../Claude-Impact-Labs-data-2/data
```

A new complaint is matched to a work order of the same category on the nearest road in the
chosen ward, and its status replays that tender's real timeline on a fast demo clock
(`HOUR_MS` in `src/pages/citizen/mock.ts`).
