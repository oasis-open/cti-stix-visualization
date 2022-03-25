"use strict";


// Copied from old stix2viz code: define additional graph edge types from
// STIX embedded relationships.  (And convert to a proper Map object.)
//
// keys are the name of the _ref/s property, values are the name of the
// relationship and whether the object with that property should be the
// source_ref in the relationship
let refsMapping = new Map(Object.entries({
    created_by_ref: ["created-by", true],
    object_marking_refs: ["applies-to", false],
    object_refs: ["refers-to", true],
    sighting_of_ref: ["sighting-of", true],
    observed_data_refs: ["observed", true],
    where_sighted_refs: ["saw", false],
    object_ref: ["applies-to", true],
    sample_refs: ["sample-of", false],
    analysis_sco_refs: ["captured-by", false],
    contains_refs: ["contains", true],
    resolves_to_refs: ["resolves-to", true],
    belongs_to_ref: ["belongs-to", true],
    from_ref: ["from", true],
    sender_ref: ["sent-by", true],
    to_refs: ["to", true],
    cc_refs: ["cc", true],
    bcc_refs: ["bcc", true],
    raw_email_ref: ["raw-binary-of", false],
    parent_directory_ref: ["parent-of", false],
    content_ref: ["contents-of", false],
    src_ref: ["source-of", false],
    dst_ref: ["destination-of", false],
    src_payload_ref: ["source-payload-of", false],
    dst_payload_ref: ["destination-payload-of", false],
    encapsulates_refs: ["encapsulated-by", false],
    encapsulated_by_ref: ["encapsulated-by", true],
    opened_connection_refs: ["opened-by", false],
    creator_user_ref: ["created-by", true],
    image_ref: ["image-of", false],
    parent_ref: ["parent-of", false]
}));


/**
 * A JSON.parse() "reviver" function which may be used to cause JSON.parse()
 * to produce a Map instead of a plain javascript object (from a JSON object).
 */
function mapReviver(key, value)
{
    if (typeof value === "object" && !Array.isArray(value))
        return new Map(Object.entries(value));
    else
        return value;
}


/**
 * Do the same thing as normal JSON.parse(), but translate JSON objects into
 * Javascript Map's instead of plain objects.  That way we can use more sane
 * container types.
 */
function jsonParseToMap(jsonContent)
{
    return JSON.parse(jsonContent, mapReviver);
}


/**
 * Given a name, modify it to make it unique: add a "(n)" suffix depending
 * on the content of nameCounts.  nameCounts contains the number of times the
 * name was previously seen.  nameCounts is updated as necessary.
 *
 * @param baseName A computed name, which may not be unique
 * @param nameCounts Bookkeeping to support uniqueification, mapping previously
 *      seen base names to counts
 * @return A uniquefied name
 */
function uniquefyName(baseName, nameCounts)
{
    let uniqueName;
    let nameCount = nameCounts.get(baseName) || 0;

    ++nameCount;
    nameCounts.set(baseName, nameCount);

    if (nameCount === 1)
        uniqueName = baseName;
    else
        uniqueName = baseName + "(" + nameCount.toString() + ")";

    return uniqueName;
}


/**
 * Find a name for the given STIX object.  This will be the label users see
 * in the graph.  If a name has already been computed for the object, it is
 * returned.  Otherwise, a new name is computed and data structures updated
 * (stixIdToName and nameCounts).
 *
 * @param stixObject a STIX object
 * @param stixIdToName A mapping from IDs of STIX objects to previously
 *      computed names.
 * @param nameCounts A mapping from names to counts, used to uniquefy new names.
 * @return A name
 */
function nameForStixObject(stixObject, stixIdToName, nameCounts)
{
    let stixId = stixObject.get("id");

    let name = stixIdToName.get(stixId);
    if (!name)
    {
        // TODO: replace this with a smarter way of obtaining names
        let baseName = stixObject.get("type");
        name = uniquefyName(baseName, nameCounts);
        stixIdToName.set(stixId, name);
    }

    return name;
}


/**
 * Find a name for a STIX object with the given ID.  This name will be the
 * label users see in the graph.  If a name has already been computed for the
 * object, it is returned.  Otherwise, a new name is computed and data
 * structures updated (stixIdToName and nameCounts).  If the ID doesn't resolve
 * to a known object, null is returned.
 *
 * @param stixObject a STIX object
 * @param stixIdToObject A mapping from STIX ID to object, representing all of
 *      the objects we know about.
 * @param stixIdToName A mapping from IDs of STIX objects to previously
 *      computed names.
 * @param nameCounts A mapping from names to counts, used to uniquefy new names.
 * @return A name, or null
 */
function nameForStixId(stixId, stixIdToObject, stixIdToName, nameCounts)
{
    let name = stixIdToName.get(stixId) || null;
    if (!name)
    {
        let object = stixIdToObject.get(stixId);
        if (object)
            name = nameForStixObject(object, stixIdToName, nameCounts);
    }

    return name;
}


/**
 * Create an object representing an echarts link.  Any changes to link config
 * settings can be made here.
 *
 * @param sourceName A link source name; should be the name of a graph node
 * @param sourceName A link target name; should be the name of a graph node
 * @param label A label to be associated with the link
 * @return A link object
 */
function makeLinkObject(sourceName, targetName, label)
{
    let link = {
        source: sourceName,
        target: targetName,
        label: {
            show: true,
            formatter: label
        }
    };

    return link;
}


/**
 * Create a echarts link object from the given STIX relationship object, if
 * possible.  If source or target_ref returns to an unknown object, the link
 * can't be created and null is returned.
 *
 * @param stixRel a STIX relationship object
 * @param stixIdToObject A mapping from STIX ID to object, representing all of
 *      the objects we know about.
 * @param stixIdToName A mapping from IDs of STIX objects to previously
 *      computed names.
 * @param nameCounts A mapping from names to counts, used to uniquefy new names.
 * @return An echarts link object, or null if one could not be created
 */
function linkForRelationship(stixRel, stixIdToObject, stixIdToName, nameCounts)
{
    let sourceRef = stixRel.get("source_ref");
    let targetRef = stixRel.get("target_ref");
    let relType = stixRel.get("relationship_type");

    let sourceName = nameForStixId(
        sourceRef, stixIdToObject, stixIdToName, nameCounts
    );
    let targetName = nameForStixId(
        targetRef, stixIdToObject, stixIdToName, nameCounts
    );

    let link = null;
    if (sourceName && targetName)
        link = makeLinkObject(sourceName, targetName, relType);
    else
        console.warn(
            "Skipped relationship %s %s %s: missing endpoint objects",
            sourceRef, relType, targetRef
        );

    return link;
}


function linksForEmbeddedRelationships(
    stixObject, stixIdToObject, stixIdToName, nameCounts
)
{
    let sourceName = nameForStixObject(stixObject, stixIdToName, nameCounts);
    let links = [];

    for (let [propName, value] of stixObject)
    {
        let relInfo = refsMapping.get(propName);

        if (relInfo)
        {
            // "forward" link direction is referrer->referent
            // "backward" is referent->referrer
            let [linkLabel, forward] = relInfo;
            let refs;

            if (propName.endsWith("_ref"))
                refs = [value];
            else
                refs = value;

            for (let ref of refs)
            {
                let targetName = nameForStixId(
                    ref, stixIdToObject, stixIdToName, nameCounts
                );

                if (targetName)
                {
                    if (!forward)
                        [sourceName, targetName] = [targetName, sourceName];

                    let link = makeLinkObject(
                        sourceName, targetName, linkLabel
                    );
                    links.push(link);
                }
                else
                    console.warn(
                        "Skipped embedded relationship %s %s %s: target object"
                        + " missing",
                        stixObject.get("id"), propName, ref
                    );
            }
        }
    }

    return links;
}


/**
 * Make the nodes and links structures echarts requires, from the given STIX
 * bundle.
 *
 * @param stixBundle a STIX bundle, as parsed JSON (using Maps instead of
 *      plain javascript objects).
 * @return nodes and links structures in a 2-element array.
 */
function makeNodesAndLinks(stixBundle)
{
    // Create a different data structure for the objects: a mapping from ID
    // to object.  This makes object lookups by STIX ID fast.
    let stixIdToObject = new Map();

    for (let object of stixBundle.get("objects"))
        stixIdToObject.set(object.get("id"), object);

    // List of graph nodes, where each list element is whatever echarts needs
    // to represent the node.  This is a plain javascript object with a "name"
    // property at least, to identify the node.
    let nodes = [];

    // List of links/edges for the graph, where each list element is whatever
    // echarts needs to represent the link.  This is a plain javascript object
    // with "source" and "target" properties at least, which represent the
    // linked nodes.  Source/target can be node names or ordinals with respect
    // to the above list; here we will just use names.
    let links = [];

    // Used to uniquefy names.  E.g. first "foo" gets the name, then others
    // will be "foo(2)", "foo(3)", etc.  This map keeps track of those counts.
    // Maps the "base" name as computed for the STIX object, to a count.
    let nameCounts = new Map();

    // Map STIX IDs to the node names we use in the graph.
    let stixIdToName = new Map();

    for (let [id, object] of stixIdToObject)
    {
        if (object.get("type") === "relationship")
        {
            let link = linkForRelationship(
                object, stixIdToObject, stixIdToName, nameCounts
            );

            if (link)
                links.push(link);
        }
        else
        {
            let name = nameForStixObject(object, stixIdToName, nameCounts);
            nodes.push({
                name: name
            });

            let embeddedRelLinks = linksForEmbeddedRelationships(
                object, stixIdToObject, stixIdToName, nameCounts
            );

            // Seems like there ought to be a better way to extend one array
            // with the contents of another.
            links.push(...embeddedRelLinks);
        }
    }

    return [nodes, links];
}


/**
 * The entrypoint for users of this module: create a graph which visualizes
 * the content in the given STIX bundle.  The content will be added to the
 * webpage DOM under the given element.
 */
function makeGraph(echarts, domElement, stixBundleJson)
{
    // set of non-SRO STIX types present in the graph.  Used to create a
    // legend.
    let stixTypes = new Set();


    let stixBundle = jsonParseToMap(stixBundleJson);

    let [nodes, links] = makeNodesAndLinks(stixBundle);

    //console.log(nodes);
    //console.log(links);

    let initOpts = {
        renderer: "svg"  // or "canvas"
    };

    let chartOpts = {
        series: {
            type: "graph",
            // using true or "move" here seems to cause the whole graph
            // to move when dragging one node.  Seems like a bug...
            roam: "scale",
            draggable: true,
            layout: "force",
            force: {
                // causes nodes to repel each other
                repulsion: 100,
                // causes layout to distance linked nodes by this amount.
                // (so if farther, this is an attractive force; if smaller, it
                // is repulsive.)
                edgeLength: 100,
                // causes nodes to be attracted to the center
                gravity: 0.1
            },
            label: {
                show: true
            },
            // draw arrowheads on the target end of the links
            edgeSymbol: ["none", "arrow"],
            nodes: nodes,
            links: links
        }
    };

    // 2nd arg here is for theming.  E.g. could use "dark" for a dark themed
    // graph.
    let chart = echarts.init(domElement, null, initOpts);
    chart.setOption(chartOpts);
}


/**
 * Create and return an object which is this file's module.
 */
function makeModule(echarts)
{
    let module = {
        makeGraph: (domElement, stixBundleJson) =>
            makeGraph(echarts, domElement, stixBundleJson)
    };

    return module;
}


define(["echarts"], makeModule);
