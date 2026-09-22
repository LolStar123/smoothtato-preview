import { encode, decode, compare } from "./model.mjs";
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
let settings,
    mode = "safe",
    chosen = [];
function render() {
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
    $("#preset-description").textContent = preset.description;
    $("#selected-count").textContent = chosen.length;
    $("#differences").textContent =
        diff.added.length || diff.removed.length
            ? `${diff.added.length} extra removals / ${diff.removed.length} preset switches restored`
            : "matches the original preset exactly";
    const groups = new Map();
    for (const c of settings.categories) {
        if (q && !(c.label + " " + c.blurb).toLowerCase().includes(q)) continue;
        if (filter === "enabled" && !chosen.includes(c.key)) continue;
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
                    `<h3 class="group-title">${esc(g)}</h3>${cats.map((c) => `<label class="switch"><input type="checkbox" data-key="${c.key}" ${c.unavailable ? "disabled" : ""} ${chosen.includes(c.key) ? "checked" : ""}><span><strong>${esc(c.label)}</strong><small>${esc(c.blurb)}${c.unavailable ? " / unavailable in the source engine" : ""}</small></span></label>`).join("")}`,
            )
            .join("") || '<p class="note">No switches match these filters.</p>';
    try {
        localStorage.setItem(
            "smoothtato-visual-profile",
            JSON.stringify({ mode, chosen }),
        );
    } catch {}
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
    render();
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
$("#filter").onchange = render;
$("#restore").onclick = () => {
    mode = "normal";
    chosen = [];
    render();
    $("#status").textContent =
        "Original profile: no removal switches selected.";
};
$("#export").onclick = () => {
    const code = encode(mode, chosen, settings),
        url = URL.createObjectURL(new Blob([code], { type: "text/plain" })),
        a = document.createElement("a");
    a.href = url;
    a.download = "smoothtato-config.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("#status").textContent =
        "Exported a STATO1 visual profile. Import the code through the desktop app.";
};
$("#import").onclick = async () => {
    try {
        const r = await decode($("#code").value, settings);
        mode = r.mode;
        chosen = r.categories;
        render();
        $("#status").textContent = r.extra
            ? "Visual switches imported. Skin and other configuration fields are not part of this planner."
            : "Configuration imported.";
    } catch (e) {
        $("#status").textContent = e.message;
    }
};
try {
    const r = await fetch("data/settings.json");
    if (!r.ok) throw Error("Settings could not load");
    settings = await r.json();
    chosen = [...settings.presets.find((p) => p.key === mode).categories];
    try {
        const old = JSON.parse(
            localStorage.getItem("smoothtato-visual-profile"),
        );
        if (
            old &&
            settings.presets.some((p) => p.key === old.mode) &&
            Array.isArray(old.chosen) &&
            old.chosen.every((k) =>
                settings.categories.some((c) => c.key === k),
            )
        ) {
            mode = old.mode;
            chosen = old.chosen;
        }
    } catch {}
    $("#provenance").textContent =
        settings.source +
        ". All 68 engine categories are shown, including advanced categories that may not be exposed in every app release. No performance numbers are invented; no game files are changed here.";
    render();
} catch (e) {
    $("#status").textContent = e.message;
    throw e;
}
