"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const semanticIcons = require("../stix2viz/stix2viz/semantic-icons.js");

class DataSet {
    constructor(items) {
        this.items = new Map();
        (items || []).forEach(item => this.add(item));
    }

    add(item) {
        this.items.set(item.id, item);
    }

    forEach(callback) {
        this.items.forEach((item, id) => callback(item, id));
    }

    get(id) {
        return this.items.get(id);
    }
}

class Network {
    constructor(element, data, options) {
        this.element = element;
        this.data = data;
        this.options = options;
        this.handlers = {};
    }

    on(event, callback) {
        this.handlers[event] = callback;
    }
}

let stix2viz;
function define(dependencies, factory) {
    assert.deepStrictEqual(
        Array.from(dependencies),
        ["nbextensions/stix2viz/vis-network", "./semantic-icons"]
    );
    stix2viz = factory({DataSet: DataSet, Network: Network}, semanticIcons);
}
define.amd = {};

const source = fs.readFileSync(
    path.join(__dirname, "..", "stix2viz", "stix2viz", "stix2viz.js"),
    "utf8"
);
vm.runInNewContext(source, {
    console: console,
    Date: Date,
    Error: Error,
    Map: Map,
    Set: Set,
    Array: Array,
    Object: Object,
    JSON: JSON,
    RegExp: RegExp,
    define: define
});

assert.ok(stix2viz, "AMD factory did not produce the stix2viz module");
assert.strictEqual(
    stix2viz.resolveIcon("observed-string").primary.path,
    "extension/observed-string.svg"
);

const tlpId = "marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da";
const stixObjects = new Map([
    [tlpId, new Map([
        ["type", "marking-definition"],
        ["id", tlpId]
    ])],
    ["file--00000000-0000-4000-8000-000000000001", new Map([
        ["type", "file"],
        ["id", "file--00000000-0000-4000-8000-000000000001"],
        ["name", "sample.bin"],
        ["defanged", true],
        ["extensions", new Map([["archive-ext", new Map()]])]
    ])],
    ["tool--00000000-0000-4000-8000-000000000002", new Map([
        ["type", "tool"],
        ["id", "tool--00000000-0000-4000-8000-000000000002"],
        ["name", "custom icon"]
    ])]
]);
const nodeData = new DataSet([
    {id: tlpId, label: "TLP green", version: null},
    {
        id: "file--00000000-0000-4000-8000-000000000001",
        label: "sample.bin",
        version: null
    },
    {
        id: "tool--00000000-0000-4000-8000-000000000002",
        label: "custom icon",
        version: null
    }
]);
const config = {
    iconDir: "/legacy",
    semanticIconDir: "/semantic",
    tool: {displayIcon: "https://example.test/custom-tool.svg"}
};

const view = stix2viz.makeGraphView(
    {}, nodeData, new DataSet(), stixObjects, config
);
const tlpNode = view.nodeDataSet.get(tlpId);
assert.strictEqual(tlpNode.image, "/semantic/marking/tlp-green.svg");
assert.match(tlpNode.accessibleName, /tlp-green/);

const fileNode = view.nodeDataSet.get(
    "file--00000000-0000-4000-8000-000000000001"
);
assert.strictEqual(fileNode.image, "/semantic/sco/file.svg");
assert.deepStrictEqual(
    Array.from(fileNode.iconMetadata.badges, badge => badge.key),
    ["archive-ext"]
);
assert.deepStrictEqual(
    Array.from(fileNode.iconMetadata.states, state => state.key),
    ["defanged"]
);
assert.match(fileNode.accessibleName, /extensions: archive-ext/);
assert.match(fileNode.accessibleName, /states: defanged/);

const customNode = view.nodeDataSet.get(
    "tool--00000000-0000-4000-8000-000000000002"
);
assert.strictEqual(
    customNode.image,
    "https://example.test/custom-tool.svg",
    "absolute displayIcon URL must remain the highest-priority override"
);

const legend = view.legendData[0];
assert.strictEqual(legend.get("marking-definition"), "/semantic/marking/tlp-green.svg");
assert.strictEqual(legend.get("file"), "/semantic/sco/file.svg");
assert.strictEqual(legend.get("tool"), "https://example.test/custom-tool.svg");

console.log("stix2viz semantic integration tests passed");
