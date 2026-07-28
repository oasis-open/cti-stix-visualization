"use strict";

/*
 * Semantic STIX 2.1 icon resolution.
 *
 * This module deliberately returns file paths rather than recoloring SVGs in
 * CSS.  SVGs loaded by vis-network as external canvas images do not inherit
 * currentColor from the containing page.
 */
(function(root, factory) {
    if (typeof define === "function" && define.amd)
        define([], factory);
    else if (typeof module === "object" && module.exports)
        module.exports = factory();
    else
        root.stix2SemanticIcons = factory();
}(this, function() {
    const entityPaths = {
        "attack-pattern": "sdo/attack-pattern.svg",
        "campaign": "sdo/campaign.svg",
        "course-of-action": "sdo/course-of-action.svg",
        "grouping": "sdo/grouping.svg",
        "identity": "sdo/identity.svg",
        "incident": "sdo/incident.svg",
        "indicator": "sdo/indicator.svg",
        "infrastructure": "sdo/infrastructure.svg",
        "intrusion-set": "sdo/intrusion-set.svg",
        "location": "sdo/location.svg",
        "malware": "sdo/malware.svg",
        "malware-analysis": "sdo/malware-analysis.svg",
        "note": "sdo/note.svg",
        "observed-data": "sdo/observed-data.svg",
        "opinion": "sdo/opinion.svg",
        "report": "sdo/report.svg",
        "threat-actor": "sdo/threat-actor.svg",
        "tool": "sdo/tool.svg",
        "vulnerability": "sdo/vulnerability.svg",
        "artifact": "sco/artifact.svg",
        "autonomous-system": "sco/autonomous-system.svg",
        "directory": "sco/directory.svg",
        "domain-name": "sco/domain-name.svg",
        "email-addr": "sco/email-addr.svg",
        "email-message": "sco/email-message.svg",
        "file": "sco/file.svg",
        "ipv4-addr": "sco/ipv4-addr.svg",
        "ipv6-addr": "sco/ipv6-addr.svg",
        "mac-addr": "sco/mac-addr.svg",
        "mutex": "sco/mutex.svg",
        "network-traffic": "sco/network-traffic.svg",
        "process": "sco/process.svg",
        "software": "sco/software.svg",
        "url": "sco/url.svg",
        "user-account": "sco/user-account.svg",
        "windows-registry-key": "sco/windows-registry-key.svg",
        "x509-certificate": "sco/x509-certificate.svg",
        "relationship": "sro/relationship.svg",
        "sighting": "sro/sighting.svg",
        "extension-definition": "smo/extension-definition.svg",
        "language-content": "smo/language-content.svg",
        "marking-definition": "smo/marking-definition.svg",
        "bundle": "bundle/bundle.svg"
    };

    const extensionObjectPaths = {
        "event": "extension/event.svg",
        "impact": "extension/impact.svg",
        "task": "extension/task.svg",
        "observed-string": "extension/observed-string.svg"
    };

    const aliasPaths = {
        "coa": "sdo/course-of-action.svg",
        "language": "smo/language-content.svg",
        "restricted-marking": "marking/statement-marking.svg",
        "http": "badge/http-request-ext.svg",
        "tlp": "smo/marking-definition.svg",
        "source": "legacy/source.svg",
        "victim": "legacy/victim.svg",
        "victim-target": "legacy/victim-target.svg",
        "custom-object": "fallback/custom-object.svg"
    };

    const tlpById = {
        "marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9":
            ["tlp-white", "marking/tlp-white.svg"],
        "marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da":
            ["tlp-green", "marking/tlp-green.svg"],
        "marking-definition--f88d31f6-486f-44da-b317-01333bde0b82":
            ["tlp-amber", "marking/tlp-amber.svg"],
        "marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed":
            ["tlp-red", "marking/tlp-red.svg"]
    };

    const tlpByValue = {
        "white": ["tlp-white", "marking/tlp-white.svg"],
        "green": ["tlp-green", "marking/tlp-green.svg"],
        "amber": ["tlp-amber", "marking/tlp-amber.svg"],
        "red": ["tlp-red", "marking/tlp-red.svg"],
        "clear": ["tlp-clear", "marking/tlp-clear.svg"],
        "amber+strict": ["tlp-amber-strict", "marking/tlp-amber-strict.svg"],
        "amber-strict": ["tlp-amber-strict", "marking/tlp-amber-strict.svg"],
        "amber strict": ["tlp-amber-strict", "marking/tlp-amber-strict.svg"]
    };

    const markingExtensionsById = {
        "extension-definition--dff17fb3-edcb-4f99-ad1b-4b751c95738a":
            ["cui", "marking/cui.svg"],
        "extension-definition--f8d78575-edfd-406e-8e84-6162a8450f5b":
            ["pap", "marking/pap.svg"],
        "extension-definition--762e2e97-ee51-43e5-a9ea-165fbb862c4a":
            ["iep", "marking/iep.svg"]
    };

    const extensionObjectsById = {
        "extension-definition--4ca6de00-5b0d-45ef-a1dc-ea7279ea910e":
            ["event", "extension/event.svg"],
        "extension-definition--7cc33dd6-f6a1-489b-98ea-522d351d71b9":
            ["impact", "extension/impact.svg"],
        "extension-definition--2074a052-8be4-4932-849e-f5e7798e0030":
            ["task", "extension/task.svg"],
        "extension-definition--8b1aa84c-5532-4c69-a8e7-b6170facfd3d":
            ["observed-string", "extension/observed-string.svg"]
    };

    const extensionBadgePaths = {
        "archive-ext": "badge/archive-ext.svg",
        "ntfs-ext": "badge/ntfs-ext.svg",
        "pdf-ext": "badge/pdf-ext.svg",
        "raster-image-ext": "badge/raster-image-ext.svg",
        "windows-pebinary-ext": "badge/windows-pebinary-ext.svg",
        "http-request-ext": "badge/http-request-ext.svg",
        "icmp-ext": "badge/icmp-ext.svg",
        "socket-ext": "badge/socket-ext.svg",
        "tcp-ext": "badge/tcp-ext.svg",
        "windows-process-ext": "badge/windows-process-ext.svg",
        "windows-service-ext": "badge/windows-service-ext.svg",
        "unix-account-ext": "badge/unix-account-ext.svg"
    };

    function valueAt(object, key) {
        return object instanceof Map ? object.get(key) : object && object[key];
    }

    function keysOf(value) {
        if (value instanceof Map)
            return Array.from(value.keys());
        if (value && typeof value === "object")
            return Object.keys(value);
        return [];
    }

    function normalize(value) {
        return typeof value === "string" ? value.trim().toLowerCase() : "";
    }

    function asset(key, path, kind, reason) {
        return {key: key, path: path, kind: kind, reason: reason};
    }

    function pairAsset(pair, kind, reason) {
        return asset(pair[0], pair[1], kind, reason);
    }

    function resolveIcon(input, options) {
        options = options || {};
        const object = typeof input === "string" ? {type: input} : input || {};
        const type = normalize(valueAt(object, "type"));
        const extensions = valueAt(object, "extensions");
        const extensionKeys = keysOf(extensions);
        let primary = null;

        const canonicalTlp = tlpById[valueAt(object, "id")];
        if (canonicalTlp)
            primary = pairAsset(canonicalTlp, "marking", "canonical-tlp-id");

        if (!primary) {
            const id = extensionKeys.find(key => markingExtensionsById[key]);
            if (id)
                primary = pairAsset(
                    markingExtensionsById[id],
                    "marking-extension",
                    "marking-extension-id"
                );
        }

        if (!primary && type === "marking-definition") {
            const definitionType = normalize(valueAt(object, "definition_type"));
            const definition = valueAt(object, "definition");
            const name = valueAt(object, "name");
            if (
                definitionType === "statement"
                || valueAt(definition, "statement")
            )
                primary = asset(
                    "statement-marking",
                    "marking/statement-marking.svg",
                    "marking",
                    "definition-type"
                );
            else if (
                definitionType === "tlp"
                || valueAt(definition, "tlp")
                || valueAt(object, "tlp")
                || (typeof name === "string" && /^TLP\s*:/i.test(name))
            ) {
                const tlpValue = normalize(
                    valueAt(definition, "tlp")
                    || valueAt(object, "tlp")
                    || (typeof name === "string"
                        ? name.replace(/^TLP\s*:\s*/i, "") : "")
                );
                if (tlpByValue[tlpValue])
                    primary = pairAsset(
                        tlpByValue[tlpValue], "marking", "definition-value"
                    );
            }
        }

        if (!primary && entityPaths[type])
            primary = asset(type, entityPaths[type], "entity", "exact-type");
        if (!primary && extensionObjectPaths[type])
            primary = asset(
                type, extensionObjectPaths[type], "extension-object", "exact-type"
            );
        if (!primary && aliasPaths[type])
            primary = asset(
                type, aliasPaths[type], "compatibility-alias", "alias"
            );

        if (!primary) {
            const id = extensionKeys.find(key => extensionObjectsById[key]);
            if (id)
                primary = pairAsset(
                    extensionObjectsById[id],
                    "extension-object",
                    "attached-extension-id"
                );
        }

        if (!primary) {
            const category = normalize(
                options.category || valueAt(object, "icon_category")
            );
            const categoryPath = {
                "sdo": "fallback/custom-sdo.svg",
                "sco": "fallback/custom-sco.svg",
                "sro": "fallback/custom-sro.svg",
                "smo": "fallback/custom-smo.svg"
            }[category];
            primary = asset(
                category ? "custom-" + category : "custom-object",
                categoryPath || "fallback/custom-object.svg",
                "fallback",
                "fallback"
            );
        }

        const badges = [];
        extensionKeys.forEach(function(key) {
            if (extensionBadgePaths[key])
                badges.push(asset(
                    key,
                    extensionBadgePaths[key],
                    "extension-badge",
                    "attached-extension-key"
                ));
            else if (
                key.indexOf("extension-definition--") === 0
                && !markingExtensionsById[key]
                && !extensionObjectsById[key]
            )
                badges.push(asset(
                    "custom-extension",
                    "badge/custom-extension.svg",
                    "extension-badge",
                    "unknown-extension-definition"
                ));
        });

        const granularMarkings = valueAt(object, "granular_markings");
        const states = [];
        if (valueAt(object, "defanged") === true)
            states.push(asset(
                "defanged", "state/defanged.svg", "state-badge",
                "property:defanged"
            ));
        if (valueAt(object, "revoked") === true)
            states.push(asset(
                "revoked", "state/revoked.svg", "state-badge",
                "property:revoked"
            ));
        if (Array.isArray(granularMarkings) && granularMarkings.length) {
            states.push(asset(
                "granular-marking", "state/granular-marking.svg",
                "state-badge", "property:granular_markings"
            ));
        }
        const granularLanguage = Array.isArray(granularMarkings)
            && granularMarkings.some(marking => Boolean(valueAt(marking, "lang")));
        if (valueAt(object, "lang") || granularLanguage)
            states.push(asset(
                "language-marking", "state/language-marking.svg",
                "state-badge", "property:lang"
            ));

        return {primary: primary, badges: badges, states: states};
    }

    function joinURL(base, path) {
        if (!base)
            return path;
        return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
    }

    return {
        aliasPaths: aliasPaths,
        entityPaths: entityPaths,
        extensionBadgePaths: extensionBadgePaths,
        extensionObjectPaths: extensionObjectPaths,
        joinURL: joinURL,
        resolveIcon: resolveIcon
    };
}));
