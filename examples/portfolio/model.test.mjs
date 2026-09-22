import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { encode, decode, compare } from "./model.mjs";
const settings = JSON.parse(
    readFileSync(new URL("./data/settings.json", import.meta.url)),
);
const sorted = (a) => [...a].sort();
function pack(body) {
    const bytes = Buffer.concat([
        Buffer.from("D"),
        deflateRawSync(Buffer.from(body)),
    ]);
    const s = bytes.toString("base64url");
    return (
        "STATO1-" +
        s +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[
            [...s].reduce((n, c) => (n + c.charCodeAt(0)) & 63, 0)
        ]
    );
}
test("all five actual presets round trip", async () => {
    assert.equal(settings.categories.length, 68);
    for (const p of settings.presets) {
        const code = encode(p.key, p.categories, settings),
            r = await decode(code, settings);
        assert.equal(r.mode, p.key);
        assert.deepEqual(sorted(r.categories), sorted(p.categories));
    }
});
test("wire format uses real newline-delimited preset deltas", async () => {
    const p = settings.presets.find((p) => p.key === "safe"),
        chosen = p.categories.filter((c) => c !== "rain").concat("fogoff");
    const code = encode("safe", chosen, settings),
        raw = Buffer.from(code.slice(7, -1), "base64url").toString();
    assert.equal(raw, "Rsafe\nfogoff\nrain");
    assert.deepEqual(
        sorted((await decode(code, settings)).categories),
        sorted(chosen),
    );
    assert.deepEqual(compare(p.categories, chosen), {
        added: ["fogoff"],
        removed: ["rain"],
    });
});
test("desktop deflate codes, extra fields and corruption", async () => {
    const r = await decode(pack("normal\nrain\n\narc-skin"), settings);
    assert.deepEqual(r.categories, ["rain"]);
    assert.equal(r.extra, true);
    await assert.rejects(() => decode("STATO1-AAAA", settings));
    await assert.rejects(() =>
        decode(pack("normal\nunknown-category"), settings),
    );
});
