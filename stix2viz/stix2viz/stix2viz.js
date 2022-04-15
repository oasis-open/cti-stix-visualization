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
 * Instances represent general invalid STIX content passed into the visualizer.
 */
class STIXContentError extends Error
{
    constructor(message=null, opts=null)
    {
        // Use a default generic message.
        if (!message)
            message = "Invalid STIX content: expected a non-empty mapping"
            + " (object or Map) which is a single STIX object or bundle with"
            + " at least one object, or a non-empty array of objects.";

        super(message, opts);
    }
}


/**
 * Instances represent a particular invalid STIX object.
 */
class InvalidSTIXObjectError extends STIXContentError
{
    constructor(stixObject, opts=null)
    {
        let message = "Invalid STIX object: requires at least type and id"
        + " properties";

        // May as well give some extra info if we know it.  It may seem
        // silly to say we require an id property... and them give the value
        // of the id property!  I think users will get the idea.
        let stixId = stixObject.get("id");
        if (stixId)
            message += ": " + stixId;

        super(message, opts);

        this.stixObject = stixObject;
    }
}


/**
 * Determine whether the given value is a plain javascript object.  E.g. one
 * which was given as an object literal.
 */
function isPlainObject(value)
{
    let result = false;

    // null/undefined would cause errors in Object.getPrototypeOf(), and
    // {} and [] are actually truthy in javascript!  I don't think anything
    // falsey could be a plain object.
    if (value)
        // https://stackoverflow.com/questions/52001739/what-is-considered-a-plain-object
        result = Object.getPrototypeOf(value) === Object.prototype;

    return result;
}


/**
 * A JSON.parse() "reviver" function which may be used to cause JSON.parse()
 * to produce a Map instead of a plain javascript object (from a JSON object).
 */
function mapReviver(key, value)
{
    if (isPlainObject(value))
        return new Map(Object.entries(value));
    else
        return value;
}


/**
 * Recursively search through the given value and convert all plain objects
 * found into Map's.
 */
function recursiveObjectToMap(obj)
{
    let newValue;

    if (isPlainObject(obj))
    {
        let map = new Map();
        for (let [key, value] of Object.entries(obj))
            map.set(key, recursiveObjectToMap(value));

        newValue = map;
    }
    else if (Array.isArray(obj))
        newValue = obj.map(recursiveObjectToMap);
    else
        newValue = obj;

    return newValue;
}


/**
 * Convert the given content to a data structure which uses Maps.  E.g. for
 * strings, do the same thing as normal JSON.parse(), but translate JSON
 * objects into Javascript Maps instead of plain objects.  For plain objects,
 * convert them and their sub-objects to Maps.  That way we can use more sane
 * container types.
 *
 * @param stixContent A JSON string, plain object, or array
 * @return The converted content
 */
function parseToMap(jsonContent)
{
    let newValue;

    if (typeof jsonContent === "string" || jsonContent instanceof String)
        newValue = JSON.parse(jsonContent, mapReviver);
    else
        newValue = recursiveObjectToMap(jsonContent);

    return newValue;
}


/**
 * Somewhat the reverse of parseToMap: convert all maps within the given value
 * to plain objects.
 *
 * @param value Any value
 * @return A value without Maps
 */
function mapToObject(value)
{
    if (value instanceof Map)
    {
        let obj = {};
        for (let [subKey, subValue] of value)
            obj[subKey] = mapToObject(subValue);
        value = obj;
    }
    else if (Array.isArray(value))
        value = value.map(mapToObject);

    return value;
}


/**
 * Perform a simple sanity check on a STIX object to determine whether it's
 * valid.
 *
 * @param object The STIX object
 * @return true if the object is valid; false if not
 */
function isValidStixObject(stixObject)
{
    // assume we've gone through the normalization process such that we
    // can assume we have a Map object.  This is more about whether an object
    // has what we need, than whether we have an object in the first place.
    return stixObject.has("id") && stixObject.has("type");
}


/**
 * Check whether the given URL resolves to a usable icon file.
 *
 * @param iconURL The URL to check
 * @return true if the URL resolves to a usable file; false if not
 */
async function iconFileExists(iconURL)
{
    let existsPromise = new Promise((resolve, reject) => {
        let tmpImg = new Image();
        tmpImg.onload = (event) => resolve(true);
        tmpImg.onerror = (event) => resolve(false);
        tmpImg.src = iconURL;
    });

    return await existsPromise;
}


/**
 * Given a name, modify it to make it unique: add a "(n)" suffix depending
 * on the content of nameCounts.  nameCounts contains the number of times the
 * name was previously seen.  nameCounts is updated as necessary.
 *
 * @param baseName A computed name, which may not be unique
 * @param nameCounts Bookkeeping to support uniquefication, mapping previously
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
 * @param config A config object containing preferences for naming objects;
 *      null to use defaults
 * @return A name
 */
function nameForStixObject(stixObject, stixIdToName, nameCounts, config=null)
{
    let stixId = stixObject.get("id");
    let stixType = stixObject.get("type");

    let name = stixIdToName.get(stixId);
    if (!name)
    {
        let baseName;
        let userLabels;

        // Look for an ID-specific label; if that fails, look for a
        // type-specific label; if that fails, use some hard-coded fallbacks,
        // which eventually just default to using the STIX type.
        if (config)
            userLabels = config.userLabels;

        if (userLabels)
            baseName = userLabels[stixId];

        if (!baseName)
        {
            let typeConfig;
            if (config)
                 typeConfig = config[stixType];
            if (typeConfig)
            {
                let labelPropName = typeConfig.display_property;
                if (labelPropName)
                    baseName = stixObject.get(labelPropName);
            }
        }

        // Copied from old visualizer, fall back to some hard-coded properties
        if (!baseName)
            baseName = stixObject.get("name");
        if (!baseName)
            baseName = stixObject.get("value");
        if (!baseName)
            baseName = stixObject.get("path");
        if (!baseName)
            baseName = stixType;

        // Copied from old visualizer: ensure the name isn't too long.
        if (baseName.length > 100)
          baseName = baseName.substr(0,100) + '...';

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
 * @param stixId a STIX ID
 * @param stixIdToObject A mapping from STIX ID to object, representing all of
 *      the objects we know about.
 * @param stixIdToName A mapping from IDs of STIX objects to previously
 *      computed names.
 * @param nameCounts A mapping from names to counts, used to uniquefy new names.
 * @param config A config object containing preferences for naming objects;
 *      null to use defaults
 * @return A name, or null
 */
function nameForStixId(
    stixId, stixIdToObject, stixIdToName, nameCounts, config=null
)
{
    let name = stixIdToName.get(stixId) || null;
    if (!name)
    {
        let object = stixIdToObject.get(stixId);
        if (object)
            name = nameForStixObject(object, stixIdToName, nameCounts, config);
    }

    return name;
}


/**
 * Create a URL to an icon file for the given STIX type.  This does not check
 * whether the icon file actually exists.
 *
 * @param stixType the STIX type to get a URL for
 * @param iconPath A path to prepend to an icon filename.  The path is
 *      prepended as <path>/<filename>, i.e. it is separated from the filename
 *      with a forward slash.  If null/undefined, don't prepend a path.
 * @param iconFileName An icon file name.  If falsey, a default is constructed
 *      from the given STIX type.
 * @return A URL of an icon for the given STIX type
 */
function stixTypeToIconURL(stixType, iconPath, iconFileName)
{
    let iconUrl;

    if (!iconFileName)
        iconFileName = "stix2_"
            + stixType.replaceAll("-", "_")
            + "_icon_tiny_round_v1.png";

    if (iconPath === null || iconPath === undefined)
        iconUrl = iconFileName;
    else
        iconUrl = iconPath + "/" + iconFileName;

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
        category: categoryIndices.get(stixType),
        // we don't need to set any icon config here; it is inherited from the
        // category.

        // I don't know if this is frowned upon, but mouse click events
        // include this node object.  We can sneak in some useful extra
        // information for our click handlers.
        //
        // Sadly, we must convert back to a plain object, or echarts will
        // clobber it!
        _stixObject: mapToObject(stixObject)
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
 * @param config A config object containing preferences for naming objects;
 *      null to use defaults
 * @return An echarts link object, or null if one could not be created
 */
function linkForRelationship(
    stixRel, stixIdToObject, stixIdToName, nameCounts, config=null
)
{
    let sourceRef = stixRel.get("source_ref");
    let targetRef = stixRel.get("target_ref");
    let relType = stixRel.get("relationship_type");

    let sourceName = nameForStixId(
        sourceRef, stixIdToObject, stixIdToName, nameCounts, config
    );
    let targetName = nameForStixId(
        targetRef, stixIdToObject, stixIdToName, nameCounts, config
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
 * @param config A config object containing preferences for naming objects;
 *      null to use defaults
 * @return An array of echarts link objects
 */
function linksForEmbeddedRelationships(
    stixObject, stixIdToObject, stixIdToName, nameCounts, config=null
)
{
    let sourceName = nameForStixObject(
        stixObject, stixIdToName, nameCounts, config
    );
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
                    ref, stixIdToObject, stixIdToName, nameCounts, config
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
 * @param stixObjects an array of STIX objects
 * @param categories Echarts data for categories.  This is an array of objects;
 *      the important part of each object is the "name" property giving the
 *      category name, which is a STIX type.  It is used to tag each echarts
 *      node with a category according to its type.
 * @param config A config object containing preferences for naming objects;
 *      null to use defaults
 * @return nodes and links structures in a 2-element array.
 */
function makeNodesAndLinks(stixObjects, categories, config=null)
{
    // Create a different data structure for the objects: a mapping from ID
    // to object.  This makes object lookups by STIX ID fast.
    let stixIdToObject = new Map();

    for (let object of stixObjects)
        stixIdToObject.set(object.get("id"), object);

    // Tagging a node with its category involves assigning an index into this
    // categories array.  Would have been easier to just use category names...
    // anyway, this map enables efficient lookup of a category index by name.
    let categoryIndices = new Map();
    for (let [index, category] of categories.entries())
        categoryIndices.set(category.name, index);

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
                object, stixIdToObject, stixIdToName, nameCounts, config
            );

            if (link)
                links.push(link);
        }
        else
        {
            let name = nameForStixObject(
                object, stixIdToName, nameCounts, config
            );
            let node = makeNodeObject(name, object, categoryIndices);
            nodes.push(node);

            let embeddedRelLinks = linksForEmbeddedRelationships(
                object, stixIdToObject, stixIdToName, nameCounts, config
            );

            // Seems like there ought to be a better way to extend one array
            // with the contents of another.
            links.push(...embeddedRelLinks);
        }
    }

    return [nodes, links];
}


/**
 * Create a fallback icon URL to use any time the usual STIX type based
 * icon file is not found.  (Implied: this default is the same, regardless of
 * STIX type.)  Of course, this fallback *should* be known to always exist!
 *
 * @param iconPath The user-configured setting for the icon directory, in case
 *      it is relevant for the fallback; null if one was not configured.
 * @return A URL to an icon
 */
function getDefaultIconURL(iconPath=null)
{
    let defaultURL = stixTypeToIconURL('custom_object', iconPath, null);
    defaultURL = defaultURL.replace('.png', '.svg');

    return defaultURL;
}


/**
 * Create an echarts categories structure, based on STIX types.  We will have
 * one category per type.
 *
 * @param stixObjects An array of STIX objects
 * @param config User config data
 * @return An array of categories for echarts
 */
async function makeCategories(stixObjects, config=null)
{
    let iconPath = null;
    if (config)
        iconPath = config.iconDir;

    let defaultIconURL = getDefaultIconURL(iconPath);

    let stixTypes = new Set();

    // collect our types
    for (let object of stixObjects)
        stixTypes.add(object.get("type"));

    // relationships don't correspond to node types...
    stixTypes.delete("relationship");

    let categories = [];
    for (let type of stixTypes)
    {
        // Choose an icon file according to config settings
        let iconFileName;

        if (config)
        {
            let typeConfig = config[type];
            if (typeConfig)
                iconFileName = typeConfig.display_icon;
        }

        let iconURL = stixTypeToIconURL(type, iconPath, iconFileName);

        let iconExists = await iconFileExists(iconURL);
        if (!iconExists)
            iconURL = defaultIconURL;

        let category = {
            name: type,
            symbol: "image://" + iconURL
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
        let entry = {
            name: category.name,
            icon: category.symbol
        };

        legendData.push(entry);
    }

    let legend = {
        data: legendData,
        orient: "vertical",
        left: "right",
        top: "bottom",
        itemWidth: 14 // Prevent squashed icons
    };

    return legend;
}


/**
 * STIX content input to the visualizer can take different forms.  This
 * function normalizes it to an array of objects, so subsequent code only
 * deals with a single form.  Each object is itself normalized to a Map
 * instance (as are all sub-objects).
 *
 * This function also does some simple sanity checks on the input to try to
 * ensure it is valid.
 *
 * @param stixContent STIX content as given to the visualizer
 * @return An array of objects if the content was valid; null if it was not
 *      valid.
 * @throw STIXContentError if any errors are found in the input
 */
function normalizeContent(stixContent)
{
    let stixObjects;

    try
    {
        stixContent = parseToMap(stixContent);
    }
    catch (err)
    {
        // wrap misc errors (e.g. JSON.parse() errors, which are SyntaxErrors)
        // with our generic STIX content error
        if (err instanceof STIXContentError)
            throw err;
        throw new STIXContentError(null, {cause: err});
    }

    if (stixContent instanceof Map && stixContent.size > 0)
    {
        if (stixContent.get("type") === "bundle")
            stixObjects = stixContent.get("objects") || [];
        else
            // Assume we were given a single object
            stixObjects = [stixContent];
    }
    else if (Array.isArray(stixContent))
        stixObjects = stixContent;
    else
        throw new STIXContentError();

    if (!Array.isArray(stixObjects) || stixObjects.length <= 0)
        throw new STIXContentError();

    // Do a simple validity check on our individual STIX objects.
    for (let stixObject of stixObjects)
        if (!isValidStixObject(stixObject))
            throw new InvalidSTIXObjectError(stixObject);

    return stixObjects;
}


/**
 * The entrypoint for users of this module: create a graph which visualizes
 * the content in the given STIX bundle.  The content will be added to the
 * webpage DOM under the given element.
 *
 * @param echarts The echarts module object
 * @param domElement the parent element where the chart is to be located in a
 *      web page
 * @param stixContent STIX content as a JSON string, object, or array of
 *      objects.
 * @param config A config object containing preferences for naming objects;
 *      null to use defaults
 * @return The chart object.  May be used perform certain options on the
 *      chart, e.g. dispose of it.
 */
async function makeGraph(echarts, domElement, stixContent, config=null)
{
    let stixObjects = normalizeContent(stixContent);

    let categories = await makeCategories(stixObjects, config);
    let legend = makeLegend(categories);

    let [nodes, links] = makeNodesAndLinks(stixObjects, categories, config);

    let initOpts = {
        renderer: "svg"  // or "canvas"
    };

    let chartOpts = {
        legend: legend,
        series: {
            type: "graph",
            // Make graph zoomable.
            // using true or "move" here to enable panning seems to often cause
            // the whole graph to move when dragging one node.  Seems like a
            // bug...
            roam: true,
            // disable draggable nodes for now, due to echarts bugs
            draggable: false,
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
            // Applies to node labels.  Move them a bit so they don't
            // completely cover the icon.
            label: {
                show: true,
                align: "left",
                verticalAlign: "bottom",
                offset: [22,0],
                color: "#000",
                textBorderColor: "#fff",
                textBorderWidth: 2,
                fontWeight: "bold",
                fontSize: 13
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
                show: true,
                fontWeight: "bold"
            },
            // Enable single node selection, define a style for a selected
            // node.
            selectedMode: "single",
            select: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: "#000",
                    shadowOffsetX: 5,
                    shadowOffsetY: 5
                }
            }
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
        makeGraph: (domElement, stixContent, config=null) =>
            makeGraph(echarts, domElement, stixContent, config)
    };

    return module;
}


define(["nbextensions/stix2viz/echarts"], makeModule);
