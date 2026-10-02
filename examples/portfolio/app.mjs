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
// Short UI labels; canonical source labels remain in settings.json and tooltips.
const switchLabels = {
    "all": "Remove all particles",
    "playerblack": "Hide player and gear",
    "monsterblack": "Hide monsters and attack animations",
    "hideoutmesh": "Hide hideout decorations",
    "cassiablack": "Hide Cassia and Blight glint",
    "npcblack": "Hide NPCs and glows",
    "volatiledeadblack": "Hide Volatile Dead orbs",
    "lioneyebannerblack": "Remove Lioneye flag and cloth",
    "strictpropsblack": "Hide quest banners and back attachments",
    "attackcontrollerblack": "Remove remaining combat effects",
    "effectsexcept": "Remove effects except encounter cues",
    "chareffects": "Remove character glows and charges",
    "terraincontrollerblack": "Remove remaining terrain effects",
    "terrainmesh": "Remove all terrain",
    "charselectmesh": "Hide character-select scene",
    "water": "Remove water",
    "auras": "Remove aura and skill-effect packs",
    "floorflat": "Blacken ground textures",
    "hideoutflat": "Blacken hideout decoration thumbnails",
    "blackflag": "Remove Lioneye quest flag",
    "doodads": "Remove decorative props",
    "noshadow": "Disable shadows, reflections and fog",
    "allflat": "Blacken world textures",
    "effectflat": "Remove smoke and effect textures",
    "envcubeblack": "Blacken environment reflections",
    "clothblack": "Remove cloth, banners and capes",
    "smokeblack": "Remove smoke and mist meshes",
    "killlights": "Remove object lights",
    "killlightprofiles": "Disable profiled lights",
    "moodygrade": "Darken colour grade",
    "mapreveal": "Reveal minimap",
    "relight": "Darken unlit glow surfaces",
    "lightdim": "Dim local lights to 50%",
    "lightshaderkill": "Disable local light rendering",
    "flaskicons": "Blacken flask icons",
    "gemicons": "Blacken gem icons",
    "currencyicons": "Blacken currency icons",
    "mapicons": "Blacken map icons",
    "itemicons": "Blacken other item icons",
    "fullblackflat": "Blacken non-UI textures",
    "itemfxblack": "Blacken item influence glows",
    "inventorycubemapsblack": "Blacken inventory reflections",
    "itemlookupsblack": "Blacken item lookup textures",
    "synthitemfxblack": "Blacken synthesis effects",
    "audiostripblack": "Mute sound",
    "emissiveoff": "Disable shader glow",
    "bloomkill": "Remove bloom",
    "enemyhealthblack": "Blacken enemy health bars",
    "bootlogosblack": "Blacken startup logos",
    "loadingblack": "Blacken loading artwork",
    "loginblack": "Blacken login artwork",
    "charselectflat": "Blacken character-select textures",
    "particlesonly": "Remove blood, rain and impact particles",
    "petexcept": "Remove particles except encounter cues",
    "epkexcept": "Remove effect packs except encounter cues",
    "emitter1": "Single lightning emitter (no-op)",
    "attackfx": "Remove attack and spell particles",
    "mtx": "Remove cosmetic particles",
    "ground": "Remove ground-effect particles",
    "floor": "Remove ambient floor particles",
    "enviro": "Remove mist and dust particles",
    "fogoff": "Disable distance and volumetric fog",
    "rain": "Remove rain",
    "blood": "Remove blood and gore particles",
    "corpses": "Remove corpses",
    "npcs": "Hide NPC models",
    "crafting": "Hide crafting tables",
    "players": "Hide other players"
};
const presetDescriptions = {
    normal: "Restore original graphics.",
    safe: "Remove ambient and cosmetic particles, blood, rain, bloom, corpses and sound; dim local lights to 50%.",
    aggressive: "Performance plus skill particles with encounter-cue exceptions, decorative props, smoke and water.",
    heavy: "League Start plus additional effect removal, with encounter-cue exceptions; disable shadows, reflections and fog.",
    blackout: "Remove terrain, characters, effects, lighting and sound; blacken menu artwork. Item icons remain."
};
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
                `<button data-preset="${p.key}" aria-pressed="${mode === p.key}">${esc(p.label)}</button>`,
        )
        .join("");
    $("#preset-description").textContent = presetDescriptions[mode];
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
    $("#preview-state").textContent = comparing ? "Original comparison" : preset.label + (diff.added.length || diff.removed.length ? " / custom" : "");
    $("#compare").setAttribute("aria-pressed", comparing);
    $("#compare").textContent = comparing ? "Show my graphics" : "Compare Original";
    const groups = new Map();
    if ($("#group").options.length === 1)
        $("#group").innerHTML += [
            ...new Set(settings.categories.map((c) => c.group)),
        ]
            .map((g) => `<option>${esc(g)}</option>`)
            .join("");
    for (const c of settings.categories) {
        if ($("#group").value && c.group !== $("#group").value) continue;
        if (q && !(switchLabels[c.key] + " " + c.label + " " + c.blurb).toLowerCase().includes(q)) continue;
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
                    `<h3 class="group-title">${esc(g)}</h3>${cats.map((c) => `<label class="switch"><input type="checkbox" data-key="${c.key}" ${c.unavailable ? "disabled" : ""} ${chosen.includes(c.key) ? "checked" : ""}><span><strong title="${esc(c.label)}">${esc(switchLabels[c.key] || c.label)}</strong>${c.unavailable ? '<small>Unavailable</small>' : ''}</span></label>`).join("")}`,
            )
            .join("") || '<p class="note">No switches match these filters.</p>';
    saveGraphics(mode, chosen);
    const effects = effectProfile(catalogue);
    $("#profile-summary").textContent = `${chosen.length} graphics / ${effects.length} cosmetics`;
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
    $("#status").textContent = "";
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
    $("#status").textContent = "Original restored";
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
    $("#status").textContent = "Profile exported";
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
        $("#status").textContent = "Profile imported";
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
    document.querySelectorAll("button, input, select, textarea").forEach((el) => el.disabled = false);
    render();
} catch (e) {
    $("#status").textContent = "The settings or effects catalogue could not load. Reload to retry.";
}
