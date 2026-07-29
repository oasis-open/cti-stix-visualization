"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const icons = require("../stix2viz/stix2viz/semantic-icons.js");

const projectRoot = path.resolve(__dirname, "..");
const assetRoot = path.join(
    projectRoot, "stix2viz", "stix2viz", "icons", "stix-2.1"
);

function resolved(input, options) {
    return icons.resolveIcon(input, options);
}

function assertAssetExists(asset) {
    assert.ok(asset.path.endsWith(".svg"), asset.path);
    assert.ok(
        fs.existsSync(path.join(assetRoot, asset.path)),
        "missing asset: " + asset.path
    );
}

assert.strictEqual(
    Object.keys(icons.entityPaths).length,
    43,
    "mapping must cover all 43 serialized top-level types"
);
assert.strictEqual(
    Object.keys(icons.typeColors).length,
    43,
    "filled palette must cover all 43 serialized top-level types"
);

function relativeLuminance(hex) {
    const channels = [1, 3, 5].map(index =>
        parseInt(hex.slice(index, index + 2), 16) / 255
    ).map(channel =>
        channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * channels[0]
        + 0.7152 * channels[1]
        + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
    const luminances = [
        relativeLuminance(first), relativeLuminance(second)
    ].sort((left, right) => right - left);
    return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

for (const type of Object.keys(icons.entityPaths))
    assertAssetExists(resolved({type: type}).primary);

for (const [type, expectedColor] of Object.entries(icons.typeColors)) {
    assert.ok(
        contrastRatio(expectedColor, "#FFFFFF") >= 4.5,
        type + " must provide 4.5:1 contrast with its white glyph"
    );
    const result = resolved({type: type}, {variant: "filled"});
    assert.strictEqual(
        result.primary.path,
        "filled/" + icons.entityPaths[type]
    );
    assert.strictEqual(result.primary.variant, "filled");
    assert.deepStrictEqual(result.primary.presentation, {
        background: expectedColor,
        foreground: "#FFFFFF"
    });
    assertAssetExists(result.primary);
}

// Relationship is represented as an edge and bundle is unpacked by the
// visualizer.  Both still need resolver coverage for direct API consumers.
assert.strictEqual(resolved("relationship").primary.path, "sro/relationship.svg");
assert.strictEqual(resolved("bundle").primary.path, "bundle/bundle.svg");

const canonicalTlp = {
    "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9": "tlp-white",
    "marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da": "tlp-green",
    "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82": "tlp-amber",
    "marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed": "tlp-red"
};
for (const id of Object.keys(canonicalTlp)) {
    const result = resolved({type: "marking-definition", id: id});
    assert.strictEqual(result.primary.key, canonicalTlp[id]);
    assert.strictEqual(result.primary.reason, "canonical-tlp-id");
    assertAssetExists(result.primary);
}

assert.strictEqual(
    resolved({
        type: "marking-definition",
        definition_type: "statement",
        definition: {statement: "Internal only"}
    }).primary.key,
    "statement-marking"
);
for (const value of [
    "white", "green", "amber", "red", "clear",
    "amber+strict", "amber-strict", "amber strict"
]) {
    const result = resolved({
        type: "marking-definition",
        definition_type: "tlp",
        definition: {tlp: value}
    });
    assert.strictEqual(result.primary.kind, "marking");
    assertAssetExists(result.primary);

    const filled = resolved({
        type: "marking-definition",
        definition_type: "tlp",
        definition: {tlp: value}
    }, {variant: "filled"});
    assert.match(filled.primary.path, /^filled\/marking\/tlp-/);
    assert.strictEqual(filled.primary.presentation.background, "#000000");
    assertAssetExists(filled.primary);
}
const filledStatement = resolved({
    type: "marking-definition",
    definition_type: "statement",
    definition: {statement: "Internal only"}
}, {variant: "filled"});
assert.strictEqual(
    filledStatement.primary.path,
    "filled/marking/statement-marking.svg"
);
assert.strictEqual(
    filledStatement.primary.presentation.background,
    "#475569"
);
assert.strictEqual(
    resolved({type: "marking-definition", name: "TLP:GREEN"}).primary.key,
    "tlp-green"
);
assert.strictEqual(
    resolved({
        type: "marking-definition",
        definition: {statement: "Internal only"}
    }).primary.key,
    "statement-marking"
);

const extensionBadges = Object.keys(icons.extensionBadgePaths);
assert.strictEqual(extensionBadges.length, 12);
for (const extension of extensionBadges) {
    const result = resolved({type: "file", extensions: {[extension]: {}}});
    assert.ok(result.badges.some(badge => badge.key === extension));
    result.badges.forEach(assertAssetExists);
}

for (const type of ["event", "impact", "task", "observed-string"]) {
    const result = resolved({type: type});
    assert.strictEqual(result.primary.kind, "extension-object");
    assertAssetExists(result.primary);
    assert.strictEqual(
        resolved({type: type}, {variant: "filled"}).primary.path,
        result.primary.path,
        "types without a filled asset must retain their glyph path"
    );
}

const candidateExtensionIds = {
    "extension-definition--4ca6de00-5b0d-45ef-a1dc-ea7279ea910e": "event",
    "extension-definition--7cc33dd6-f6a1-489b-98ea-522d351d71b9": "impact",
    "extension-definition--2074a052-8be4-4932-849e-f5e7798e0030": "task",
    "extension-definition--8b1aa84c-5532-4c69-a8e7-b6170facfd3d":
        "observed-string"
};
for (const id of Object.keys(candidateExtensionIds)) {
    const result = resolved({type: "x-candidate", extensions: {[id]: {}}});
    assert.strictEqual(result.primary.key, candidateExtensionIds[id]);
    assert.strictEqual(result.primary.reason, "attached-extension-id");
}

const markingExtensionIds = {
    "extension-definition--dff17fb3-edcb-4f99-ad1b-4b751c95738a": "cui",
    "extension-definition--f8d78575-edfd-406e-8e84-6162a8450f5b": "pap",
    "extension-definition--762e2e97-ee51-43e5-a9ea-165fbb862c4a": "iep"
};
for (const id of Object.keys(markingExtensionIds)) {
    const result = resolved({
        type: "marking-definition",
        extensions: {[id]: {}}
    });
    assert.strictEqual(result.primary.key, markingExtensionIds[id]);
    assert.strictEqual(result.primary.kind, "marking-extension");
    assertAssetExists(result.primary);
}

const stateful = resolved({
    type: "file",
    defanged: true,
    revoked: true,
    lang: "en",
    granular_markings: [{selectors: ["name"]}],
    extensions: {"extension-definition--00000000-0000-4000-8000-000000000000": {}}
});
assert.deepStrictEqual(
    stateful.states.map(state => state.key).sort(),
    ["defanged", "granular-marking", "language-marking", "revoked"]
);
assert.strictEqual(stateful.badges[0].key, "custom-extension");
stateful.states.forEach(assertAssetExists);

// Map input is the representation used internally by stix2viz.
const mapped = resolved(new Map([
    ["type", "marking-definition"],
    ["definition_type", "tlp"],
    ["definition", new Map([["tlp", "green"]])]
]));
assert.strictEqual(mapped.primary.key, "tlp-green");

for (const alias of Object.keys(icons.aliasPaths))
    assertAssetExists(resolved(alias).primary);

assert.strictEqual(
    resolved({type: "x-example"}, {category: "SDO"}).primary.path,
    "fallback/custom-sdo.svg"
);
assert.strictEqual(
    resolved({type: "x-example"}).primary.path,
    "fallback/custom-object.svg"
);
assert.strictEqual(
    icons.joinURL("/assets/icons/", "/sdo/tool.svg"),
    "/assets/icons/sdo/tool.svg"
);

const svgFiles = [];
function collectSVGs(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory())
            collectSVGs(fullPath);
        else if (entry.name.endsWith(".svg"))
            svgFiles.push(fullPath);
    }
}
collectSVGs(assetRoot);
assert.strictEqual(
    svgFiles.length, 132, "expected 82 glyphs and 50 filled assets"
);
for (const svgPath of svgFiles) {
    const source = fs.readFileSync(svgPath, "utf8");
    assert.match(source, /<svg\b/);
    assert.doesNotMatch(source, /<script\b/i);
    assert.doesNotMatch(source, /\son[a-z]+\s*=/i);
    assert.doesNotMatch(
        source,
        /(?:href|src)\s*=\s*["'](?:https?:|javascript:|data:)/i
    );
}

const filledFiles = svgFiles.filter(svgPath =>
    svgPath.includes(path.join("stix-2.1", "filled"))
);
assert.strictEqual(filledFiles.length, 50);
for (const svgPath of filledFiles) {
    const source = fs.readFileSync(svgPath, "utf8");
    assert.match(
        source,
        /<circle cx="32" cy="32" r="31" fill="#[0-9A-F]{6}" stroke="none"\/>/,
        path.relative(assetRoot, svgPath)
            + " needs a self-contained circular background"
    );
    assert.doesNotMatch(source, /<text\b|font-family|<script\b/i);
}

console.log("semantic icon tests passed (" + svgFiles.length + " SVG assets)");
