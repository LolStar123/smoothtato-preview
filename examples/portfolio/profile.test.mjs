import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encode, decode } from "./model.mjs";
import { encode as encodeEffects } from "./cosmetics/model.mjs";
import { importedEffects } from "./profile.mjs";

const settings = JSON.parse(readFileSync(new URL("./data/settings.json", import.meta.url)));
const catalogue = JSON.parse(readFileSync(new URL("./cosmetics/data/catalogue.json", import.meta.url)));

test("both editors export the same graphics deltas and cosmetic keys", async () => {
    const preset = settings.presets.find((p) => p.key === "safe");
    const chosen = preset.categories.filter((key) => key !== "rain").concat("fogoff");
    const effects = [catalogue.find((r) => r.Key === "celestial_aura_effect")];
    const fromGraphics = encode("safe", chosen, settings, effects.map((r) => r.Key));
    const fromEffects = encodeEffects(effects, { mode: "safe", chosen }, settings);
    assert.equal(fromGraphics, fromEffects);
    const decoded = await decode(fromEffects, settings);
    assert.equal(decoded.mode, "safe");
    assert.deepEqual([...decoded.categories].sort(), [...chosen].sort());
    assert.deepEqual(decoded.skins, effects.map((r) => r.Key));
    assert.equal(decoded.extra, false);
});

test("import refuses unknown or unmapped effects and multiple effects for one skill", () => {
    assert.throws(() => importedEffects(["unknown-effect"], catalogue));
    const mapped = catalogue.filter((r) => r.Pairs?.length);
    const first = mapped.find((r) => mapped.some((s) => s.Skill === r.Skill && s.Key !== r.Key));
    const second = mapped.find((r) => r.Skill === first.Skill && r.Key !== first.Key);
    assert.throws(() => importedEffects([first.Key, second.Key], catalogue));
    assert.equal(importedEffects([first.Key, first.Key], catalogue).length, 1);
});
