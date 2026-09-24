const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export function checksum(s) {
    return alphabet[[...s].reduce((n, c) => (n + c.charCodeAt(0)) & 63, 0)];
}
export function conflicts(items) {
    const paths = new Map(),
        found = [];
    for (const item of items)
        for (const p of item.Pairs || []) {
            if (paths.has(p.Base) && paths.get(p.Base).target !== p.Mtx)
                found.push({
                    path: p.Base,
                    first: paths.get(p.Base).key,
                    second: item.Key,
                });
            paths.set(p.Base, { target: p.Mtx, key: item.Key });
        }
    return found;
}
export function encode(items) {
    if (conflicts(items).length)
        throw Error(
            "Two effects overwrite the same base asset. Remove one first.",
        );
    const body = ["normal", "", "", items.map((i) => i.Key).join(",")].join(
            "\n",
        ),
        bytes = new TextEncoder().encode("R" + body),
        text = btoa(String.fromCharCode(...bytes))
            .replaceAll("+", "-")
            .replaceAll("/", "_")
            .replace(/=+$/, "");
    return "STATO1-" + text + checksum(text);
}
export async function decode(code) {
    const match = code.trim().match(/STATO1-([A-Za-z0-9_-]+)/i);
    if (!match) throw Error("Expected a STATO1 config code");
    const text = match[1].slice(0, -1);
    if (checksum(text) !== match[1].at(-1))
        throw Error("Config checksum failed");
    const bytes = Uint8Array.from(
        atob(text.replaceAll("-", "+").replaceAll("_", "/")),
        (c) => c.charCodeAt(0),
    );
    let body;
    if (bytes[0] === 82) body = new TextDecoder().decode(bytes.slice(1));
    else if (bytes[0] === 68) {
        const stream = new Blob([bytes.slice(1)])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw"));
        body = await new Response(stream).text();
    } else throw Error("Unknown config format");
    const fields = body.split("\n");
    return {
        mode: fields[0],
        skins: (fields[3] || "").split(",").filter(Boolean),
    };
}
export function select(items, item) {
    return [
        ...items.filter((i) => i.Skill !== item.Skill && i.Key !== item.Key),
        item,
    ];
}
