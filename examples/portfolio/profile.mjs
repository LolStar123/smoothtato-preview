// Both workspaces share one browser origin and one current graphics/effects profile.
// Read old storage keys so saved selections survive the unified editor release.
export function graphicsProfile(settings) {
    const fallback = settings.presets.find((p) => p.key === "safe");
    try {
        const saved = JSON.parse(localStorage.getItem("smoothtato-visual-profile"));
        if (saved && settings.presets.some((p) => p.key === saved.mode) &&
            Array.isArray(saved.chosen) && saved.chosen.every((key) =>
                settings.categories.some((c) => c.key === key)))
            return { mode: saved.mode, chosen: [...new Set(saved.chosen)] };
    } catch {}
    return { mode: fallback.key, chosen: [...fallback.categories] };
}
export function effectProfile(catalogue) {
    try {
        const keys = JSON.parse(localStorage.getItem("mtxtato-loadout") || "[]");
        if (Array.isArray(keys)) return [...new Set(keys)]
            .map((key) => catalogue.find((r) => r.Key === key)).filter(Boolean);
    } catch {}
    return [];
}
export function saveGraphics(mode, chosen) {
    try { localStorage.setItem("smoothtato-visual-profile", JSON.stringify({ mode, chosen })); }
    catch {}
}
export function saveEffects(items) {
    try { localStorage.setItem("mtxtato-loadout", JSON.stringify(items.map((r) => r.Key))); }
    catch {}
}
export function importedEffects(keys, catalogue) {
    const items = [...new Set(keys)].map((key) => catalogue.find((r) => r.Key === key));
    if (items.some((r) => !r || !r.Pairs?.length))
        throw Error("This code contains unmapped effects outside this catalogue. The current profile has been kept.");
    const skills = items.map((r) => r.Skill);
    if (new Set(skills).size !== skills.length)
        throw Error("This code selects multiple effects for one skill. The current profile has been kept.");
    return items;
}
