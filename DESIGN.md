# Smoothtato demo design

Smoothtato has two jobs: remove expensive game effects and add cosmetic replacements. The demo keeps both under one product name while giving each task its own workspace.

## Graphics workbench

The main page behaves like a graphics tuning bench. A live game-like viewport changes with the real preset state, so the effect of a switch is visible before the full 68-setting list. Presets, search, filtering, reset, import and export all use the repository's actual data and codec.

The palette borrows muted forest greens from Path of Exile without copying its interface. Thin structural lines and dense monospace readouts make it feel like a tool, while the large title and spare page frame keep it readable.

## Cosmetics catalogue

The wardrobe uses the real catalogue, real preview art, compatibility evidence and loadout codec. It is intentionally more image-led than the graphics workbench because choosing an effect is a visual decision.

## Rules

- Show state changes in the viewport before explaining them.
- Keep the default view to the current preset, with the full switch list available through filters.
- Treat graphics removal and cosmetics as two parts of Smoothtato.
- Keep desktop and mobile fully functional with no horizontal overflow.
- Avoid decorative gradients, glow-heavy framing and generic dashboard cards.
