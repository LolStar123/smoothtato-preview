const presets = {
  Original: [],
  Performance: ["particles", "bloom", "cosmetic effects"],
  "League Start": [
    "particles",
    "bloom",
    "cosmetic effects",
    "decorative props",
    "skill effects",
    "water",
  ],
  Barebones: [
    "particles",
    "bloom",
    "cosmetic effects",
    "decorative props",
    "skill effects",
    "water",
    "shadows",
    "reflections",
    "fog",
  ],
};
export const defaults = {
  preset: "Performance",
  assets: [
    {
      id: "boss-ring",
      category: "boss telegraph",
      enabled: true,
      protected: true,
    },
    {
      id: "aura-warning",
      category: "aura cue",
      enabled: true,
      protected: true,
    },
    { id: "world-floor", category: "world", enabled: true, protected: true },
    ...[
      "particles",
      "bloom",
      "cosmetic effects",
      "decorative props",
      "skill effects",
      "water",
      "shadows",
      "reflections",
      "fog",
    ].map((category, n) => ({
      id: "category-" + n,
      category,
      enabled: true,
      protected: false,
    })),
  ],
};
export const controls = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    options: Object.keys(presets),
  },
];
export function plan(assets, preset) {
  if (!(preset in presets)) throw Error("Unknown preset.");
  const changes = assets.map((a) => ({
    ...a,
    before: a.enabled,
    after: a.protected ? true : !presets[preset].includes(a.category),
  }));
  return {
    changes,
    restore: assets.map(({ id, enabled }) => ({ id, enabled })),
    disabled: changes.filter((a) => !a.after).length,
  };
}
export function run(i) {
  const r = plan(i.assets, i.preset);
  return {
    summary: i.preset + ": a reversible preset plan",
    metrics: {
      "categories disabled": r.disabled,
      "protected cues retained": r.changes.filter((a) => a.protected && a.after)
        .length,
    },
    columns: ["category", "before", "after", "reason"],
    rows: r.changes.map((a) => [
      a.category,
      a.before ? "on" : "off",
      a.after ? "on" : "off",
      a.protected ? "combat / navigation cue" : "preset selection",
    ]),
    steps: [
      "Choose the desired preset",
      "Resolve affected effect categories",
      "Keep encounter cues protected",
      "Save the change list and restoration snapshot",
    ],
    artifact: r,
  };
}
