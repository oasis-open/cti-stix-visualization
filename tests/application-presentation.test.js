"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "application.css"), "utf8");
const application = fs.readFileSync(path.join(root, "application.js"), "utf8");

assert.match(
    css,
    /#legend-content img\s*\{[^}]*background-color:\s*#97c2fc;/s,
    "legend glyphs need the same explicit filled background as graph nodes"
);
assert.match(
    css,
    /#legend-content img\s*\{[^}]*border-radius:\s*50%;/s,
    "legend glyph backgrounds should remain circular"
);
assert.match(
    application,
    /img\.width = "37";\s*img\.height = "37";/,
    "SVG legend icons need explicit intrinsic dimensions"
);
assert.match(
    application,
    /td\.setAttribute\(\s*"aria-label", "Toggle " \+ displayType \+ " nodes"\s*\);/s,
    "the native legend control must retain its accessible type label"
);

console.log("application presentation tests passed");
