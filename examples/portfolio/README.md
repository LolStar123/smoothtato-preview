# smoothtato: working example

Compare preset changes and generate a reversible configuration plan.

**[Open the demo](https://lolstar123.github.io/smoothtato-preview/)** · [Calculation / workflow code](model.mjs) · [Checks](model.test.mjs)

![Example output](preview.png)

## Run it

From the repository root, with Python 3 and Node.js 22:

```sh
python -m http.server 8000 --directory examples/portfolio
```

Open http://localhost:8000. Change an input, or edit the JSON fixture, then export the computed result as JSON or CSV.

```sh
node --test examples/portfolio/model.test.mjs
```

## What it does

Choose a preset, inspect which effect categories it removes and keep the important encounter cues. Saved configurations make the changes repeatable; restoring Original brings the visuals back.

## Scope and source

A public preset planner using authored asset categories. It does not patch game files or measure FPS.

Smoothtato.App/ViewModels/MainViewModel.cs preset definitions and Smoother.Core/BundleSmoother.cs categories.

`model.mjs` is the small public implementation. `app.mjs` connects its inputs and outputs to the browser. No package install or network key is needed to run the example. GitHub Pages runs the same files after the checks pass.
