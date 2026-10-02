import { encode, conflicts, select } from "./model.mjs";
import { decode as decodeGraphics } from "../model.mjs";
import { graphicsProfile, effectProfile, saveGraphics, saveEffects, importedEffects } from "../profile.mjs";
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
let data, settings,
    selected,
    chosen = [],
    page = 0;
const compact = matchMedia("(max-width: 850px)");
const pageSize = () => compact.matches ? 8 : 24;
document.querySelectorAll("button, input, select, textarea").forEach((el) => el.disabled = true);
function image(r) {
    return r.icon
        ? `<img src="${esc(r.icon)}" alt="${esc(r.FullName)}" loading="lazy">`
        : '<span class="no-art">no preview in catalogue</span>';
}
function render() {
    const focused = document.activeElement?.dataset?.key;
    const size = pageSize(), q = $("#search").value.toLowerCase(),
        skill = $("#skill").value,
        confidence = $("#confidence").value,
        filtered = data.filter(
            (r) =>
                (!q ||
                    (r.FullName + " " + r.SkillDisplay)
                        .toLowerCase()
                        .includes(q)) &&
                (!skill || r.Skill === skill) &&
                (!confidence || r.Confidence === confidence),
        ),
        pages = Math.max(1, Math.ceil(filtered.length / size));
    page = Math.min(page, pages - 1);
    $("#count").textContent =
        `${filtered.length} effects · page ${page + 1} / ${pages}`;
    $("#prev").disabled = page === 0;
    $("#next").disabled = page === pages - 1;
    $("#prev-bottom").disabled = page === 0;
    $("#next-bottom").disabled = page === pages - 1;
    $("#page-note").textContent = `Page ${page + 1} of ${pages}`;
    $("#catalogue").innerHTML =
        filtered
            .slice(page * size, (page + 1) * size)
            .map(
                (r) =>
                    `<button class="effect" data-key="${esc(r.Key)}" aria-pressed="${selected?.Key === r.Key}">${image(r)}<span>${esc(r.FullName)}</span><small>${esc(r.SkillDisplay || r.Skill)}</small></button>`,
            )
            .join("") ||
        "<p>No effects match. Clear the search or choose all skills.</p>";
    const graphics = graphicsProfile(settings);
    $("#profile-summary").textContent = `${graphics.chosen.length} graphics / ${chosen.length} cosmetics`;
    if (focused) $(`[data-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
    window.__mtx = {
        ready: true,
        total: data.length,
        filtered: filtered.length,
        chosen: chosen.map((r) => r.Key),
    };
}
function inspect(r) {
    selected = r;
    $("#effect-title").textContent = r.FullName;
    $("#preview").innerHTML = image(r);
    $("#blurb").textContent = r.Blurb || r.SkillDisplay || r.Skill;
    $("#evidence").textContent =
        (r.Pairs?.length || 0) +
        " mappings / " +
        r.Confidence.toLowerCase() +
        " confidence";
    $("#pairs").textContent = (r.Pairs || [])
        .map((p) => p.Base + "\n  -> " + p.Mtx)
        .join("\n\n");
    $("#add").disabled = !r.Pairs?.length;
    render();
}
function basket() {
    const clashes = conflicts(chosen);
    $("#loadout-count").textContent = chosen.length;
    $("#loadout").innerHTML = chosen
        .map(
            (r) =>
                `<div><span>${esc(r.FullName)}</span><button data-remove="${esc(r.Key)}" aria-label="Remove ${esc(r.FullName)}">x</button></div>`,
        )
        .join("");
    $("#export").disabled = !chosen.length || !!clashes.length;
    $("#status").textContent = clashes.length
        ? "Two selections target the same base asset. Remove a conflicting effect before exporting."
        : "";
    saveEffects(chosen);
    render();
}
$("#catalogue").onclick = (e) => {
    const b = e.target.closest("[data-key]");
    if (b) {
        inspect(data.find((r) => r.Key === b.dataset.key));
        if (compact.matches) {
            $("#effect-desk").scrollIntoView({ block: "start" });
            $("#effect-title").focus({ preventScroll: true });
        }
    }
};
$("#add").onclick = () => {
    chosen = select(chosen, selected);
    basket();
};
$("#loadout").onclick = (e) => {
    const b = e.target.closest("[data-remove]");
    if (b) {
        chosen = chosen.filter((r) => r.Key !== b.dataset.remove);
        basket();
    }
};
for (const id of ["search", "skill", "confidence"])
    $("#" + id)[id === "search" ? "oninput" : "onchange"] = () => {
        page = 0;
        render();
    };
function turnPage(delta) {
    page += delta; render();
    $("#count").scrollIntoView({ block: "start" });
    $("#count").focus({ preventScroll: true });
}
for (const id of ["prev", "prev-bottom"]) $("#" + id).onclick = () => turnPage(-1);
for (const id of ["next", "next-bottom"]) $("#" + id).onclick = () => turnPage(1);
compact.addEventListener("change", () => { if (data) { page = 0; render(); } });
$(".back-to-catalogue").onclick = (e) => {
    e.preventDefault();
    $("#catalogue").scrollIntoView({ block: "start" });
    $(`[data-key="${CSS.escape(selected.Key)}"]`)?.focus({ preventScroll: true });
};
$("#export").onclick = () => {
    try {
        const code = encode(chosen, graphicsProfile(settings), settings),
            url = URL.createObjectURL(new Blob([code], { type: "text/plain" })),
            a = document.createElement("a");
        a.href = url;
        a.download = "smoothtato-cosmetics.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        $("#status").textContent =
            "Profile exported";
    } catch (e) {
        $("#status").textContent = e.message;
    }
};
$("#import").onclick = async () => {
    try {
        const decoded = await decodeGraphics($("#import-code").value, settings);
        if (decoded.extra) throw Error("This code includes settings this browser cannot edit. The current profile has been kept.");
        const known = importedEffects(decoded.skins, data);
        if (conflicts(known).length) throw Error("This code contains conflicting effects. The current profile has been kept.");
        chosen = known;
        saveGraphics(decoded.mode, decoded.categories);
        basket();
        $("#status").textContent = "Profile imported";
    } catch (e) {
        $("#status").textContent = e.message;
    }
};
try {
    const [response, graphics] = await Promise.all([fetch("data/catalogue.json"), fetch("../data/settings.json")]);
    if (!response.ok || !graphics.ok) throw Error("The effects or settings catalogue could not load. Reload to retry.");
    data = await response.json();
    settings = await graphics.json();
    const skills = [
        ...new Map(
            data.map((r) => [r.Skill, r.SkillDisplay || r.Skill]),
        ).entries(),
    ].sort((a, b) => a[1].localeCompare(b[1]));
    $("#skill").innerHTML +=
        "<option disabled>----------------</option>" +
        skills
            .map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`)
            .join("");
    chosen = effectProfile(data);
    document.querySelectorAll("button, input, select, textarea").forEach((el) => el.disabled = false);
    inspect(data.find((r) => r.Key === "celestial_aura_effect") || data[0]);
    basket();
} catch (e) {
    $("#status").textContent = "The effects or settings catalogue could not load. Reload to retry.";
}
