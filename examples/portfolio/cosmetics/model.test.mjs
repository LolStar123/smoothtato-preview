import test from "node:test";
import assert from "node:assert/strict";
import { encode, decode, conflicts, select } from "./model.mjs";
import { readFileSync } from "node:fs";
const data = JSON.parse(
    readFileSync(new URL("./data/catalogue.json", import.meta.url)),
);
test("real catalogue and actual config share-code round trip", async () => {
    assert.equal(data.length, 1489);
    const chosen = [data[0]],
        code = encode(chosen);
    assert.ok(code.startsWith("STATO1-"));
    assert.deepEqual((await decode(code)).skins, [data[0].Key]);
    await assert.rejects(() => decode(code.slice(0, -1) + "!"));
});
test("one effect per skill and conflicting base mappings", () => {
    const a = { Key: "a", Skill: "arc", Pairs: [{ Base: "x", Mtx: "a" }] },
        b = { Key: "b", Skill: "arc", Pairs: [{ Base: "x", Mtx: "b" }] };
    assert.equal(select([a], b).length, 1);
    assert.equal(conflicts([a, b]).length, 1);
    assert.throws(() => encode([a, b]));
});
