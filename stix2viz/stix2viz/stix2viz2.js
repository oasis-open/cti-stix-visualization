"use strict";

/*
Copied from old stix2viz code: define additional graph edge types from
STIX embedded relationships.  (And convert to a proper Map object.)

keys are the name of the _ref/s property, values are the name of the
relationship and whether the object with that property should be the
source_ref in the relationship
*/
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
 * Create an echarts image URL to an icon file for the given STIX type.
 * An image URL looks like "image://<some url>".
 */
function stixTypeToImageURL(stixType)
{
    let iconFileName = "stix2_"
        + stixType.replaceAll("-", "_")
        + "_icon_tiny_round_v1.png";

    let iconUrl = "image://stix2viz/stix2viz/icons/" + iconFileName;

    return iconUrl;
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
 * Create an object representing an echarts node.  Any changes to node config
 * settings can be made here.
 *
 * @param name A node name; will be used to label the node in the graph
 * @param stixObject The STIX object.  Provided in case any info from it is
 *      needed for configuring the node
 * @param categoryIndices A map to look up a STIX type name (used as the
 *      category name) to a category index, which is how we must tag the node.
 * @return A node object
 */
function makeNodeObject(name, stixObject, categoryIndices)
{
    let stixType = stixObject.get("type");

    let node = {
        name: name,
        category: categoryIndices.get(stixType)
    };

    return node;
}


/**
 * Create a echarts link object from the given STIX relationship object, if
 * possible.  If source or target_ref refers to an unknown object, the link
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
            "Skipped relationship %s %s %s: missing endpoint object(s)",
            sourceRef, relType, targetRef
        );

    return link;
}


/**
 * Search through the top-level properties of the given STIX object, and
 * create echarts links for embedded relationships.
 *
 * @param stixObject a STIX object
 * @param stixIdToObject A mapping from STIX ID to object, representing all of
 *      the objects we know about.
 * @param stixIdToName A mapping from IDs of STIX objects to previously
 *      computed names.
 * @param nameCounts A mapping from names to counts, used to uniquefy new names.
 * @return An array of echarts link objects
 */
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
                    let linkSrc, linkDst;
                    if (forward)
                        [linkSrc, linkDst] = [sourceName, targetName];
                    else
                        [linkSrc, linkDst] = [targetName, sourceName];

                    let link = makeLinkObject(
                        linkSrc, linkDst, linkLabel
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
 * @param categories Echarts data for categories.  This is an array of objects;
 *      the important part of each object is the "name" property giving the
 *      category name, which is a STIX type.  It is used to tag each echarts
 *      node with a category according to its type.
 * @return nodes and links structures in a 2-element array.
 */
function makeNodesAndLinks(stixBundle, categories)
{
    // Create a different data structure for the objects: a mapping from ID
    // to object.  This makes object lookups by STIX ID fast.
    let stixIdToObject = new Map();

    for (let object of stixBundle.get("objects"))
        stixIdToObject.set(object.get("id"), object);

    // Tagging a node with its category involves assigning an index into this
    // categories array.  Would have been easier to just use category names...
    // anyway, this map enables efficient lookup of a category index by name.
    let categoryIndices = new Map();
    let index = 0;
    for (let category of categories)
    {
        categoryIndices.set(category.name, index);
        ++index;
    }

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
            let node = makeNodeObject(name, object, categoryIndices);
            nodes.push(node);

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
 * Create an echarts categories structure, based on STIX types.  We will have
 * one category per type.
 *
 * @param stixBundle A STIX bundle; types are collected from the contained
 *      objects
 * @return An array of categories for echarts
 */
function makeCategories(stixBundle)
{
    let stixTypes = new Set();

    // collect our types
    for (let object of stixBundle.get("objects"))
        stixTypes.add(object.get("type"));

    // relationships don't correspond to node types...
    stixTypes.delete("relationship");

    let categories = [];
    for (let type of stixTypes)
    {
        let imageURL = stixTypeToImageURL(type);

        let category = {
            name: type,
            symbol: imageURL
        };

        categories.push(category);
    }

    return categories;
}


/**
 * Create an echarts legend structure based on the given categories.
 *
 * @param categories An echarts categories array.  This is an array of objects
 *      where each object has a "name" property (at least) giving the category
 *      name (which is a STIX type).
 * @return An echarts legend object
 */
function makeLegend(categories)
{
    let legendData = [];
    for (let category of categories)
    {
        let imageURL = stixTypeToImageURL(category.name);

        let entry = {
            name: category.name,
            icon: imageURL
        };

        legendData.push(entry);
    }

    let legend = {
        data: legendData,
        orient: "vertical",
        left: "right",
        top: "bottom"
    };

    return legend;
}


/**
 * The entrypoint for users of this module: create a graph which visualizes
 * the content in the given STIX bundle.  The content will be added to the
 * webpage DOM under the given element.
 *
 * @param echarts The echarts module object
 * @param domElement the parent element where the chart is to be located in a
 *      web page
 * @param stixBundleJson STIX content in JSON as a bundle
 * @return The chart object.  May be used perform certain options on the
 *      chart, e.g. dispose of it.
 */
function makeGraph(echarts, domElement, stixBundleJson)
{
    let stixBundle = jsonParseToMap(stixBundleJson);

    let categories = makeCategories(stixBundle);
    let legend = makeLegend(categories);

    let [nodes, links] = makeNodesAndLinks(stixBundle, categories);

    let initOpts = {
        renderer: "svg"  // or "canvas"
    };

    let chartOpts = {
        legend: legend,
        series: {
            type: "graph",
            // using true or "move" here seems to often cause the whole graph
            // to move when dragging one node.  Seems like a bug...
            roam: "scale",
            draggable: true,
            layout: "force",
            force: {
                // causes nodes to repel each other
                repulsion: 1000,
                // causes layout to distance linked nodes by this amount.
                // (so if farther, this is an attractive force; if nearer, it
                // is repulsive.)
                edgeLength: 200,
                // causes nodes to be attracted to the center
                gravity: 0.1
            },
            label: {
                show: true,
                align: "left",
                verticalAlign: "bottom"
            },
            // draw arrowheads on the target end of the links
            edgeSymbol: ["none", "arrow"],
            // Add curvature to parallel edges
            autoCurveness: true,
            categories: categories,
            nodes: nodes,
            links: links,

            // Misc aesthetic adjustments

            // Make icons larger
            symbolSize: 40,
            // Make arrowheads a little larger
            edgeSymbolSize: 15,
            // thicken edges to make them easier to see
            lineStyle: {
                width: 2,
                opacity: 1
            },
            // Thicken edge label font to make it easier to read
            edgeLabel: {
                fontWeight: "bold"
            },
        }
    };

    // 2nd arg here is for theming.  E.g. could use "dark" for a dark themed
    // graph.
    let chart = echarts.init(domElement, null, initOpts);
    chart.setOption(chartOpts);

    return chart;
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


define(["stix2viz/echarts/echarts"], makeModule);
