import { encode, decode, compare } from "./model.mjs";
import { conflicts } from "./cosmetics/model.mjs";
import { graphicsProfile, effectProfile, saveGraphics, saveEffects, importedEffects } from "./profile.mjs";
const $ = (s) => document.querySelector(s),
    esc = (s) =>
        String(s ?? "").replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c],
        );
let settings, catalogue,
    mode = "safe",
    chosen = [],
    comparing = false;
document.querySelectorAll("button, input, select, textarea").forEach((el) => el.disabled = true);
function render() {
    const focus = document.activeElement?.dataset;
    const focusKey = focus?.key, focusPreset = focus?.preset;
    const preset = settings.presets.find((p) => p.key === mode),
        diff = compare(preset.categories, chosen),
        q = $("#search").value.toLowerCase(),
        filter = $("#filter").value;
    $("#presets").innerHTML = settings.presets
        .map(
            (p) =>
                `<button data-preset="${p.key}" aria-pressed="${mode === p.key}">${esc(p.label)} <small>/ ${p.categories.length}</small></button>`,
        )
        .join("");
    $("#preset-description").textContent = preset.description.split(".")[0] + ".";
    const preview = $("#game-preview"), has = (...keys) => !comparing && keys.some((key) => chosen.includes(key));
    preview.classList.toggle("no-rain", has("rain", "particlesonly", "petexcept", "all"));
    preview.classList.toggle("no-fog", has("fogoff", "noshadow", "smokeblack", "enviro", "all"));
    preview.classList.toggle("no-bloom", has("bloomkill", "emissiveoff", "killlights", "all"));
    preview.classList.toggle("no-doodads", has("doodads", "allflat", "terrainmesh", "all"));
    preview.classList.toggle("no-corpses", has("corpses", "all"));
    preview.classList.toggle("no-other-player", has("players", "all"));
    preview.classList.toggle("no-water", has("water", "terrainmesh", "all"));
    preview.classList.toggle("no-mtx", has("mtx", "all"));
    preview.classList.toggle("no-particles", has("attackfx", "particlesonly", "petexcept", "all"));
    preview.classList.toggle("no-aura", has("auras", "all"));
    preview.classList.toggle("blackout", has("terrainmesh", "fullblackflat"));
    preview.classList.toggle("no-player", has("playerblack"));
    preview.classList.toggle("no-monster", has("monsterblack"));
    const layers = ["rain", "fog", "bloom", "doodads", "corpses", "other-player", "water", "mtx", "particles", "aura", "player", "monster"];
    const visible = layers.filter((layer) => !preview.classList.contains("no-" + layer)).length;
    $("#preview-state").textContent = comparing ? "Original comparison" : preset.label + (diff.added.length || diff.removed.length ? " / custom" : "");
    $("#scene-layers").textContent = `${visible} of ${layers.length} illustrated groups visible`;
    $("#compare").setAttribute("aria-pressed", comparing);
    $("#compare").textContent = comparing ? "Show my graphics" : "Compare Original";
    $("#differences").textContent =
        diff.added.length || diff.removed.length
            ? `+${diff.added.length} / −${diff.removed.length} from preset`
            : "preset unchanged";
    const groups = new Map();
    if ($("#group").options.length === 1)
        $("#group").innerHTML += [
            ...new Set(settings.categories.map((c) => c.group)),
        ]
            .map((g) => `<option>${esc(g)}</option>`)
            .join("");
    for (const c of settings.categories) {
        if ($("#group").value && c.group !== $("#group").value) continue;
        if (q && !(c.label + " " + c.blurb).toLowerCase().includes(q)) continue;
        if (!q && filter === "enabled" && !chosen.includes(c.key)) continue;
        if (
            filter === "changed" &&
            ![...diff.added, ...diff.removed].includes(c.key)
        )
            continue;
        if (!groups.has(c.group)) groups.set(c.group, []);
        groups.get(c.group).push(c);
    }
    $("#categories").innerHTML =
        [...groups]
            .map(
                ([g, cats]) =>
                    `<h3 class="group-title">${esc(g)}</h3>${cats.map((c) => `<label class="switch"><input type="checkbox" data-key="${c.key}" ${c.unavailable ? "disabled" : ""} ${chosen.includes(c.key) ? "checked" : ""}><span><strong>${esc(c.label)}</strong>${c.unavailable ? '<small>Unavailable in the source version</small>' : ''}</span></label>`).join("")}`,
            )
            .join("") || '<p class="note">No switches match these filters.</p>';
    const shown = [...groups.values()].reduce((n, cats) => n + cats.length, 0);
    $("#switch-count").textContent = `${shown} of ${settings.categories.length} settings shown. Checked switches apply the named change.`;
    saveGraphics(mode, chosen);
    const effects = effectProfile(catalogue);
    $("#profile-summary").textContent = `${chosen.length} graphics changes / ${effects.length} cosmetic effects in this profile`;
    $("#export").disabled = !!conflicts(effects).length;
    if (focusKey) $(`[data-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
    else if (focusPreset) $(`[data-preset="${CSS.escape(focusPreset)}"]`)?.focus({ preventScroll: true });
    window.__smooth = {
        ready: true,
        total: settings.categories.length,
        mode,
        chosen: [...chosen],
    };
}
$("#presets").onclick = (e) => {
    const b = e.target.closest("[data-preset]");
    if (!b) return;
    mode = b.dataset.preset;
    chosen = [...settings.presets.find((p) => p.key === mode).categories];
    comparing = false;
    render();
    $("#status").textContent = settings.presets.find((p) => p.key === mode).label + " graphics selected. Cosmetic effects are kept.";
};
$("#categories").onchange = (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    chosen = e.target.checked
        ? [...chosen, key]
        : chosen.filter((c) => c !== key);
    render();
};
$("#search").oninput = render;
$("#group").onchange = render;
$("#filter").onchange = render;
$("#compare").onclick = () => { comparing = !comparing; render(); };
$("#restore").onclick = () => {
    mode = "normal";
    chosen = [];
    comparing = false;
    render();
    $("#status").textContent = "Restored Original graphics. Cosmetic effects are kept.";
};
$("#export").onclick = () => {
    const effects = effectProfile(catalogue);
    if (conflicts(effects).length) {
        $("#status").textContent = "Remove conflicting effects in Cosmetics before exporting.";
        return;
    }
    const code = encode(mode, chosen, settings, effects.map((r) => r.Key)),
        url = URL.createObjectURL(new Blob([code], { type: "text/plain" })),
        a = document.createElement("a");
    a.href = url;
    a.download = "smoothtato-config.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("#status").textContent = `Exported ${chosen.length} graphics changes and ${effects.length} cosmetic effects.`;
};
$("#import").onclick = async () => {
    try {
        const r = await decode($("#code").value, settings);
        if (r.extra) throw Error("This code includes settings this browser cannot edit. The current profile has been kept.");
        const effects = importedEffects(r.skins, catalogue);
        if (conflicts(effects).length) throw Error("This code contains conflicting effects. The current profile has been kept.");
        mode = r.mode;
        chosen = r.categories;
        saveEffects(effects);
        render();
        $("#status").textContent = `Imported ${chosen.length} graphics changes and ${effects.length} cosmetic effects.`;
    } catch (e) {
        $("#status").textContent = e.message;
    }
};
try {
    const [r, c] = await Promise.all([fetch("data/settings.json"), fetch("cosmetics/data/catalogue.json")]);
    if (!r.ok || !c.ok) throw Error("The settings or effects catalogue could not load. Reload to retry.");
    settings = await r.json();
    catalogue = await c.json();
    ({ mode, chosen } = graphicsProfile(settings));
    $("#provenance").textContent = "68 source settings and five presets. Browser exports do not write game files.";
    document.querySelectorAll("button, input, select, textarea").forEach((el) => el.disabled = false);
    render();
} catch (e) {
    $("#status").textContent = "The settings or effects catalogue could not load. Reload to retry.";
}
