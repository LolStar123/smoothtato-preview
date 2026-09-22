# smoothtato

Cuts Path of Exile's visual clutter with presets that keep combat cues readable.

<!-- working-example:start -->
## Try it in a minute

**[Live example](https://lolstar123.github.io/smoothtato-preview/)** · [Example code](examples/portfolio/model.mjs) · [Run locally](examples/portfolio/README.md) · [Atul's website](https://atul-kanodia-fieldnotes.atulswaggalicious.chatgpt.site)

Compare preset changes and generate a reversible configuration plan.

<img src="examples/portfolio/preview.png" alt="smoothtato example inputs and calculated output" width="760">

<!-- working-example:end -->

## The project

Choose a preset, inspect which effect categories it removes and keep the important encounter cues. Saved configurations make the changes repeatable; restoring Original brings the visuals back.

Fewer particles competing with the thing about to kill you.

## Find your way around

| Path | What is here |
| --- | --- |
| [examples/portfolio](examples/portfolio) | Runnable browser example and fixtures |
| [model.mjs](examples/portfolio/model.mjs) | Actual calculation or workflow |
| [model.test.mjs](examples/portfolio/model.test.mjs) | Reproducible checks and edge cases |
| [PROVENANCE.md](PROVENANCE.md) | How this example relates to the full project |
| [AGENTS.md](AGENTS.md) | Instructions for extending the example |

## Quick start

```sh
python -m http.server 8000 --directory examples/portfolio
node --test examples/portfolio/model.test.mjs
```

Open http://localhost:8000. No dependencies, accounts or API keys needed.

## What is included

A public preset planner using authored asset categories. It does not patch game files or measure FPS.
