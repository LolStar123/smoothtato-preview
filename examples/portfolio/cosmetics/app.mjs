import { encode, decode, conflicts, select } from "./model.mjs";
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
let data,
    selected,
    chosen = [],
    page = 0;
const size = 36;
function image(r) {
    return r.icon
        ? `<img src="${esc(r.icon)}" alt="${esc(r.FullName)}" loading="lazy">`
        : '<span class="no-art">no preview in catalogue</span>';
}
function render() {
    const q = $("#search").value.toLowerCase(),
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
        `${filtered.length} effects / page ${page + 1} of ${pages}`;
    $("#prev").disabled = page === 0;
    $("#next").disabled = page === pages - 1;
    $("#catalogue").innerHTML =
        filtered
            .slice(page * size, (page + 1) * size)
            .map(
                (r) =>
                    `<button class="effect" data-key="${esc(r.Key)}" aria-pressed="${selected?.Key === r.Key}">${image(r)}<span>${esc(r.FullName)}</span><small>${esc(r.SkillDisplay || r.Skill)}</small></button>`,
            )
            .join("") ||
        "<p>No effects match. Clear the search or choose all skills.</p>";
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
        " asset mappings / " +
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
        : chosen.length
          ? "One effect per skill. The exported code contains only this skill-effect loadout."
          : "Pick an effect to start a loadout.";
    try {
        localStorage.setItem(
            "mtxtato-loadout",
            JSON.stringify(chosen.map((r) => r.Key)),
        );
    } catch {}
    render();
}
$("#catalogue").onclick = (e) => {
    const b = e.target.closest("[data-key]");
    if (b) {
        inspect(data.find((r) => r.Key === b.dataset.key));
        if (matchMedia("(max-width: 850px)").matches)
            $("#effect-desk").scrollIntoView({ block: "start" });
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
$("#prev").onclick = () => {
    page--;
    render();
};
$("#next").onclick = () => {
    page++;
    render();
};
$("#export").onclick = () => {
    try {
        const code = encode(chosen),
            url = URL.createObjectURL(new Blob([code], { type: "text/plain" })),
            a = document.createElement("a");
        a.href = url;
        a.download = "smoothtato-cosmetics.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        $("#status").textContent =
            "Exported a STATO1 code. Import it through the application config-code field.";
    } catch (e) {
        $("#status").textContent = e.message;
    }
};
$("#import").onclick = async () => {
    try {
        const decoded = await decode($("#import-code").value),
            known = decoded.skins.map((key) => data.find((r) => r.Key === key));
        if (known.some((r) => !r))
            throw Error(
                "This code contains effects outside this skill catalogue; it has not been imported.",
            );
        chosen = known;
        basket();
        $("#status").textContent =
            "Loaded " +
            chosen.length +
            " skill effects. Other settings from the source code are not imported here.";
    } catch (e) {
        $("#status").textContent = e.message;
    }
};
try {
    const response = await fetch("data/catalogue.json");
    if (!response.ok) throw Error("Catalogue could not load");
    data = await response.json();
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
    $("#summary").textContent =
        `${data.length.toLocaleString()} effects / ${skills.length} skills / real app mappings`;
    try {
        chosen = JSON.parse(localStorage.getItem("mtxtato-loadout") || "[]")
            .map((key) => data.find((r) => r.Key === key))
            .filter(Boolean);
    } catch {}
    inspect(data.find((r) => r.Key === "celestial_aura_effect") || data[0]);
    basket();
} catch (e) {
    $("#summary").textContent = e.message;
    throw e;
}
