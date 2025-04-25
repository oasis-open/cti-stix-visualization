"use strict";
/*
Stix2viz and visjs are packaged in a way that makes them work as Jupyter
notebook extensions.  Part of the extension installation process involves
copying them to a different location, where they're available via a special
"nbextensions" path.  This path is hard-coded into their "require" module
IDs.  Perhaps it's better to use abstract names, and add special config
in all cases to map the IDs to real paths, thus keeping the modules free
of usage-specific hard-codings.  But packaging in a way I know works in
Jupyter (an already complicated environment), and having only this config
here, seemed simpler.  At least, for now.  Maybe later someone can structure
these modules and apps in a better way.
*/
require.config({
    paths: {
      "nbextensions/stix2viz/vis-network": "stix2viz/visjs/vis-network"
    }
});

require(["domReady!", "stix2viz/stix2viz/stix2viz"], function (document, stix2viz) {


    // Init some stuff
    let view = null;
    let uploader = document.getElementById('uploader');
    let canvasContainer = document.getElementById('canvas-container');
    let canvas = document.getElementById('canvas');
    let timelineVersions = null;
    let cumulativeIdGroups = null;
    let nonCumulativeIdGroups = null;

    /**
     * Build a message and display an alert window, from an exception object.
     * This will follow the exception's causal chain and display all of the
     * causes in sequence, to produce a more informative message.
     */
    function alertException(exc, initialMessage=null)
    {
        let messages = [];

        if (initialMessage)
            messages.push(initialMessage);

        messages.push(exc.toString());

        while (exc instanceof Error && exc.cause)
        {
            exc = exc.cause;
            messages.push(exc.toString());
        }

        let message = messages.join("\n\n    Caused by:\n\n");

        alert(message);
    }


    /**
     * Handle clicks on the visjs graph view.
     *
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     */
    function graphViewClickHandler(event, edgeDataSet, stixIdToObject)
    {
        if (event.nodes.length > 0)
        {
            // A click on a node
            let stixObject = stixIdToObject.get(event.nodes[0]);
            if (stixObject)
                populateSelected(stixObject, edgeDataSet, stixIdToObject);
        }
        else if (event.edges.length > 0)
        {
            // A click on an edge
            let stixRel = stixIdToObject.get(event.edges[0]);
            if (stixRel)
                populateSelected(stixRel, edgeDataSet, stixIdToObject);
            else
                // Just make something up to show for embedded relationships
                populateSelected(
                    new Map([["", "(Embedded relationship)"]]),
                    edgeDataSet, stixIdToObject
                );
        }
        // else, just a click on the canvas
    }


    /**
     * Handle clicks on the list view.
     *
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     */
    function listViewClickHandler(event, edgeDataSet, stixIdToObject)
    {
        let clickedItem = event.target;

        if (clickedItem.tagName === "LI")
        {
            let stixId = clickedItem.id;
            let stixObject = stixIdToObject.get(stixId);

            view.selectNode(stixId);

            if (stixObject)
                populateSelected(stixObject, edgeDataSet, stixIdToObject);
            else
                // Just make something up to show for embedded relationships
                populateSelected(
                    new Map([["", "(Embedded relationship)"]]),
                    edgeDataSet, stixIdToObject
                );
        }
    }


    /* ******************************************************
     * Initializes the view, then renders it.
     * ******************************************************/
    function vizStixWrapper(content, customConfig) {

        if (customConfig)
            try
            {
                customConfig = JSON.parse(customConfig);
            }
            catch(err)
            {
                alertException(err, "Invalid configuration: must be JSON");
                return;
            }
        else
            customConfig = {};

        // Hard-coded working icon directory setting for this application.
        customConfig.iconDir = "stix2viz/stix2viz/icons";

        toggleView();

        try
        {
            let [nodeDataSet, edgeDataSet, stixIdToObject]
                = stix2viz.makeGraphData(content, customConfig);

            [
                timelineVersions, cumulativeIdGroups, nonCumulativeIdGroups
            ] = makeTimelineGroups(nodeDataSet);

            let wantsList = false;
            if (nodeDataSet.length > 200)
                wantsList = confirm(
                    "This graph contains " + nodeDataSet.length.toString()
                    + " nodes.  Do you wish to display it as a list?"
                );

            if (wantsList)
            {
                view = stix2viz.makeListView(
                    canvas, nodeDataSet, edgeDataSet, stixIdToObject,
                    customConfig
                );

                view.on(
                    "click",
                    e => listViewClickHandler(e, edgeDataSet, stixIdToObject)
                );
            }
            else
            {
                view = stix2viz.makeGraphView(
                    canvas, nodeDataSet, edgeDataSet, stixIdToObject,
                    customConfig
                );

                view.on(
                    "click",
                    e => graphViewClickHandler(e, edgeDataSet, stixIdToObject)
                );
            }

            setupTimelineSlider(timelineVersions);
            populateLegend(...view.legendData);
        }
        catch (err)
        {
            console.log(err);
            alertException(err);
        }
    }

    function makeTimelineGroups(nodeDataSet, edgeDataSet)
    {
        // Find all non-null distinct version timestamps, in sorted order
        let distinctVersions = nodeDataSet.distinct("version");
        let idxNull = distinctVersions.indexOf(null);
        if (idxNull > -1)
            distinctVersions.splice(idxNull, 1);

        distinctVersions.sort((d1, d2) => d1 - d2);

        // Group node IDs by version.  For the cumulative groups, the last
        // group gets all IDs and previous groups get progressively fewer.
        let cumulativeIdGroups = [];
        let nonCumulativeIdGroups = [];
        for (let _ of distinctVersions)
        {
            cumulativeIdGroups.push(new Set());
            nonCumulativeIdGroups.push(new Set());
        }

        nodeDataSet.forEach(function(item) {
            let firstGroup = 0;

            if (item.version !== null)
                firstGroup = distinctVersions.indexOf(item.version);

            for (let i=firstGroup; i < distinctVersions.length; i++)
                cumulativeIdGroups[i].add(item.id);

            nonCumulativeIdGroups[firstGroup].add(item.id);
        });

        //console.log(distinctVersions);

        return [distinctVersions, cumulativeIdGroups, nonCumulativeIdGroups];
    }

    function setTimelineSliderLabelFor(sliderValue)
    {
        let slider = document.getElementById("timeline");
        let sliderLabel = slider.labels.item(0);

        let selectedVersion = timelineVersions[sliderValue];

        let timestampString = new Date(selectedVersion).toISOString();
        sliderLabel.textContent = "Timeline: " + timestampString;
    }

    function setupTimelineSlider(timelineVersions)
    {
        let slider = document.getElementById("timeline");
        let checkbox = document.getElementById("timelineCheckbox");

        if (timelineVersions.length < 1)
            return;

        slider.min = 0;
        slider.max = timelineVersions.length - 1;
        slider.value = slider.max;
        slider.disabled = false;

        setTimelineSliderLabelFor(slider.value);

        checkbox.disabled = false;
    }

    function setVisibilityForTimeline()
    {
        let timelineSlider = document.getElementById("timeline");
        let timelineCheckbox = document.getElementById("timelineCheckbox");

        let sliderValue = timelineSlider.value;
        let cumulative = timelineCheckbox.checked;
        let idGroups = cumulative ? cumulativeIdGroups : nonCumulativeIdGroups;

        let selectedGroup = idGroups[sliderValue];

        setTimelineSliderLabelFor(sliderValue);
        view.setVisible(selectedGroup);
    }

    function sliderChangeHandler(event)
    {
        event.stopPropagation();

        // Ignore the event and just read values from the webpage.  This makes
        // the handler agnostic to which event triggered the change.  You can
        // hook this handler to any event and it will do the same thing.
        setVisibilityForTimeline();
    }

    /* ----------------------------------------------------- *
     * ******************************************************
     * This group of functions is for handling file "upload."
     * They take an event as input and parse the file on the
     * front end.
     * ******************************************************/
    function handleFileSelect(evt) {
      handleFiles(evt.target.files);
    }
    function handleFileDrop(evt) {
      evt.stopPropagation();
      evt.preventDefault();

      handleFiles(evt.dataTransfer.files);
    }
    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }
    function handleFiles(files) {
      // files is a FileList of File objects (in our case, just one)

      for (var i = 0, f; f = files[i]; i++) {
        document.getElementById('chosen-files').innerText += f.name + " ";
        let customConfig = document.getElementById('paste-area-custom-config').value;
        var r = new FileReader();
        r.onload = function(e) {vizStixWrapper(e.target.result, customConfig);};
        r.readAsText(f);
      }
      linkifyHeader();
    }
    /* ---------------------------------------------------- */

    /* ******************************************************
     * Handles content pasted to the text area.
     * ******************************************************/
    function handleTextarea() {
      let customConfig = document.getElementById('paste-area-custom-config').value;
      let content = document.getElementById('paste-area-stix-json').value;
      vizStixWrapper(content, customConfig);
      linkifyHeader();
    }

    /* ******************************************************
     * Fetches STIX 2.0 data from an external URL (supplied
     * user) via AJAX. Server-side Access-Control-Allow-Origin
     * must allow cross-domain requests for this to work.
     * ******************************************************/
    function handleFetchJson() {
      var url = document.getElementById("url").value;
      let customConfig = document.getElementById('paste-area-custom-config').value;
      fetchJsonAjax(url, function(content) {
        vizStixWrapper(content, customConfig);
      });
      linkifyHeader();
    }

    /**
     * Toggle the display of graph nodes of a particular STIX type.
     */
    function legendClickHandler(event)
    {
        if (!view)
            return;

        let td;
        let clickedTagName = event.target.tagName.toLowerCase();

        if (clickedTagName === "td")
            // ... if the legend item text was clicked
            td = event.target;
        else if (clickedTagName === "img")
            // ... if the legend item icon was clicked
            td = event.target.parentElement;
        else
            return;

        // The STIX type the user clicked on
        let toggledStixType = td.textContent.trim().toLowerCase();

        view.toggleStixType(toggledStixType);

        // style change to remind users what they've hidden.
        td.classList.toggle("typeHidden");
    }

    /* ******************************************************
     * Adds icons and information to the legend.
     * ******************************************************/
    function populateLegend(iconURLMap, defaultIconURL) {
        let tbody, tr, td;
        let colIdx = 0;
        let table = document.getElementById('legend-content');

        // Reset table content if necessary.
        if (table.tBodies.length === 0)
            tbody = table.createTBody();
        else
            tbody = table.tBodies[0];

        tbody.replaceChildren();

        tr = tbody.insertRow();

        for (let [stixType, iconURL] of iconURLMap)
        {
            let img = document.createElement('img');

            img.onerror = function() {
                // set the node's icon to the default if this image could not
                // load
                this.src = defaultIconURL;
                // our default svg is enormous... shrink it down!
                this.width = "37";
                this.height = "37";
            }
            img.src = iconURL;

            if (colIdx > 1)
            {
                colIdx = 0;
                tr = tbody.insertRow();
            }

            td = tr.insertCell();
            ++colIdx;

            td.append(img);
            td.append(stixType.charAt(0).toUpperCase() + stixType.substr(1).toLowerCase());
        }
    }

    /**
     * A JSON.stringify() replacer function to enable it to handle Map objects
     * like plain javascript objects.
     */
    function mapReplacer(key, value)
    {
        if (value instanceof Map)
        {
            let plainObj = {};
            for (let [subKey, subValue] of value)
                plainObj[subKey] = subValue;

            value = plainObj;
        }

        return value;
    }

    /**
     * Create a rendering of an array as part of rendering an overall STIX
     * object.
     *
     * @param arrayContent The array to render
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     * @param isRefs Whether the array is the value of a _refs property, i.e.
     *      an array of STIX IDs.  Used to produce a distinctive rendering for
     *      references.
     * @return The rendering as an array of DOM elements
     */
    function stixArrayContentToDOMNodes(
        arrayContent, edgeDataSet, stixIdToObject, isRefs=false
    )
    {
        let nodes = [];

        let ol = document.createElement("ol");
        ol.className = "selected-object-list";

        for (let elt of arrayContent)
        {
            let contentNodes;
            if (isRefs)
                contentNodes = stixStringContentToDOMNodes(
                    elt, edgeDataSet, stixIdToObject, /*isRef=*/true
                );
            else
                contentNodes = stixContentToDOMNodes(
                    elt, edgeDataSet, stixIdToObject
                );

            let li = document.createElement("li");
            li.append(...contentNodes);
            ol.append(li);
        }

        nodes.push(document.createTextNode("["));
        nodes.push(ol);
        nodes.push(document.createTextNode("]"));

        return nodes;
    }

    /**
     * Create a rendering of an object/dictionary as part of rendering an
     * overall STIX object.
     *
     * @param objectContent The object/dictionary to render, as a Map instance
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     * @param topLevel Whether objectContent is itself a whole STIX object,
     *      i.e. the top level of a content tree.  This is used to adjust the
     *      rendering, e.g. omit the surrounding braces at the top level.
     * @return The rendering as an array of DOM elements
     */
    function stixObjectContentToDOMNodes(
        objectContent, edgeDataSet, stixIdToObject, topLevel=false
    )
    {
        let nodes = [];

        if (!topLevel)
            nodes.push(document.createTextNode("{"));

        for (let [propName, propValue] of objectContent)
        {
            let propNameSpan = document.createElement("span");
            propNameSpan.className = "selected-object-prop-name";
            propNameSpan.append(propName + ":");

            let contentNodes;
            if (propName.endsWith("_ref"))
                 contentNodes = stixStringContentToDOMNodes(
                    propValue, edgeDataSet, stixIdToObject, /*isRef=*/true
                 );
            else if (propName.endsWith("_refs"))
                contentNodes = stixArrayContentToDOMNodes(
                    propValue, edgeDataSet, stixIdToObject, /*isRefs=*/true
                );
            else
                contentNodes = stixContentToDOMNodes(
                    propValue, edgeDataSet, stixIdToObject
                );

            let propDiv = document.createElement("div");
            propDiv.append(propNameSpan);
            propDiv.append(...contentNodes);

            if (!topLevel)
                propDiv.className = "selected-object-object-content";

            nodes.push(propDiv);
        }

        if (!topLevel)
            nodes.push(document.createTextNode("}"));

        return nodes;
    }

    /**
     * Create a rendering of a string value as part of rendering an overall
     * STIX object.
     *
     * @param stringContent The string to render
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     * @param isRef Whether the string is the value of a _ref property.  Used
     *      to produce a distinctive rendering for references.
     * @return The rendering as an array of DOM elements
     */
    function stixStringContentToDOMNodes(
        stringContent, edgeDataSet, stixIdToObject, isRef=false
    )
    {
        let nodes = [];

        let spanWrapper = document.createElement("span");
        spanWrapper.append(stringContent);

        if (isRef)
        {
            let referentObj = stixIdToObject.get(stringContent);
            if (referentObj)
            {
                spanWrapper.className = "selected-object-text-value-ref";
                spanWrapper.addEventListener(
                    "click", e => {
                        e.stopPropagation();
                        view.selectNode(referentObj.get("id"));
                        populateSelected(
                            referentObj, edgeDataSet, stixIdToObject
                        );
                    }
                );
            }
            else
                spanWrapper.className = "selected-object-text-value-ref-dangling";
        }
        else
            spanWrapper.className = "selected-object-text-value";

        nodes.push(spanWrapper);

        return nodes;
    }

    /**
     * Create a rendering of a value for which no other special rendering
     * applies, as part of rendering an overall STIX object.
     *
     * @param otherContent The content to render
     * @return The rendering as an array of DOM elements
     */
    function stixOtherContentToDOMNodes(otherContent)
    {
        let nodes = [];

        let asText;
        if (otherContent === null)
            asText = "null";
        else if (otherContent === undefined)
            asText = "undefined";  // also just in case??
        else
            asText = otherContent.toString();

        let spanWrapper = document.createElement("span");
        spanWrapper.append(asText);
        spanWrapper.className = "selected-object-nontext-value";
        nodes.push(spanWrapper);

        return nodes;
    }

    /**
     * Create a rendering of a value, as part of rendering an overall STIX
     * object.  This function dispatches to one of the more specialized
     * rendering functions based on the type of the value.
     *
     * @param stixContent The content to render
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     * @return The rendering as an array of DOM elements
     */
    function stixContentToDOMNodes(stixContent, edgeDataSet, stixIdToObject)
    {
        let nodes;

        if (stixContent instanceof Map)
            nodes = stixObjectContentToDOMNodes(
                stixContent, edgeDataSet, stixIdToObject
            );
        else if (Array.isArray(stixContent))
            nodes = stixArrayContentToDOMNodes(
                stixContent, edgeDataSet, stixIdToObject
            );
        else if (
            typeof stixContent === "string" || stixContent instanceof String
        )
            nodes = stixStringContentToDOMNodes(
                stixContent, edgeDataSet, stixIdToObject
            );
        else
            nodes = stixOtherContentToDOMNodes(stixContent);

        return nodes;
    }

    /**
     * Populate the Linked Nodes box with the connections of the given STIX
     * object.
     *
     * @param stixObject The STIX object to display connection information
     *      about
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     */
    function populateConnections(stixObject, edgeDataSet, stixIdToObject)
    {
        let objId = stixObject.get("id");

        let edges = edgeDataSet.get({
            filter: item => (item.from === objId || item.to === objId)
        });

        let eltConnIncoming = document.getElementById("connections-incoming");
        let eltConnOutgoing = document.getElementById("connections-outgoing");

        eltConnIncoming.replaceChildren();
        eltConnOutgoing.replaceChildren();

        let listIn = document.createElement("ol");
        let listOut = document.createElement("ol");

        eltConnIncoming.append(listIn);
        eltConnOutgoing.append(listOut);

        for (let edge of edges)
        {
            let targetList;
            let summaryNode = document.createElement("summary");
            let otherEndSpan = document.createElement("span");
            let otherEndObj;

            if (objId === edge.from)
            {
                otherEndObj = stixIdToObject.get(edge.to);
                otherEndSpan.append(otherEndObj.get("type"));

                summaryNode.append(edge.label + " ");
                summaryNode.append(otherEndSpan);

                targetList = listOut;
            }
            else
            {
                otherEndObj = stixIdToObject.get(edge.from);
                otherEndSpan.append(otherEndObj.get("type"));

                summaryNode.append(otherEndSpan);
                summaryNode.append(" " + edge.label);

                targetList = listIn;
            }

            otherEndSpan.className = "selected-object-text-value-ref";
            otherEndSpan.addEventListener(
                "click", e => {
                    view.selectNode(otherEndObj.get("id"));
                    populateSelected(otherEndObj, edgeDataSet, stixIdToObject);
                }
            );

            let li = document.createElement("li");
            let detailsNode = document.createElement("details");

            targetList.append(li);
            li.append(detailsNode);
            detailsNode.append(summaryNode);

            let objRenderNodes = stixObjectContentToDOMNodes(
                otherEndObj, edgeDataSet, stixIdToObject, /*topLevel=*/true
            );
            detailsNode.append(...objRenderNodes);
        }
    }

    /**
     * Populate relevant webpage areas according to a particular STIX object.
     *
     * @param stixObject The STIX object to display information about
     * @param edgeDataSet A visjs DataSet instance with graph edge data derived
     *      from STIX content
     * @param stixIdToObject A Map instance mapping STIX IDs to STIX objects as
     *      Maps, containing STIX content.
     */
    function populateSelected(stixObject, edgeDataSet, stixIdToObject) {
        // Remove old values from HTML
        let selectedContainer = document.getElementById('selection');
        selectedContainer.replaceChildren();

        let contentNodes = stixObjectContentToDOMNodes(
            stixObject, edgeDataSet, stixIdToObject, /*topLevel=*/true
        );
        selectedContainer.append(...contentNodes);

        populateConnections(stixObject, edgeDataSet, stixIdToObject);
    }

    /* ******************************************************
     * Toggle the view between the data entry container and
     * the view container
     * ******************************************************/
    function toggleView() {
      uploader.classList.toggle("hidden");
      canvasContainer.classList.toggle("hidden");
    }

    /* ******************************************************
     * Turns header into a "home" "link"
     * ******************************************************/
    function linkifyHeader() {
      var header = document.getElementById('header');
      header.classList.add('linkish');
    }

     /* *****************************************************
      * Returns the page to its original load state
      * *****************************************************/
    function resetPage() {
      var header = document.getElementById('header');
      if (header.classList.contains('linkish')) {
        toggleView();
        if (view)
        {
            view.destroy();
            view = null;
        }
        document.getElementById('files').value = ""; // reset the files input
        document.getElementById('chosen-files').innerHTML = ""; // reset the subheader text
        document.getElementById('selection').innerHTML = ""; // reset the selected node in the sidebar

        // Reset legend table
        let table = document.getElementById('legend-content');
        if (table.tBodies.length > 0)
        {
            let tbody = table.tBodies[0];
            tbody.replaceChildren();
        }

        // reset connections box
        let eltConnIncoming = document.getElementById("connections-incoming");
        let eltConnOutgoing = document.getElementById("connections-outgoing");
        eltConnIncoming.replaceChildren();
        eltConnOutgoing.replaceChildren();

        // disable timeline
        let timeline = document.getElementById("timeline");
        let timelineCheckbox = document.getElementById("timelineCheckbox");
        timeline.disabled = true;
        timelineCheckbox.disabled = true;

        timelineVersions = cumulativeIdGroups = nonCumulativeIdGroups = null;

        header.classList.remove('linkish');
      }
    }

    /* ******************************************************
     * Generic AJAX 'GET' request.
     *
     * Takes a URL and a callback function as input.
     * ******************************************************/
    function fetchJsonAjax(url, cfunc) {
      var regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i;
      if (!regex.test(url)) {
        alert("ERROR: Double check url provided");
      }

      var xhttp;
      if (window.XMLHttpRequest) {
        xhttp = new XMLHttpRequest();
      } else {
        xhttp = new ActiveXObject("Microsoft.XMLHTTP"); // For IE5 and IE6 luddites
      }
      xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
          cfunc(xhttp.responseText);
        } else if (xhttp.status != 200 && xhttp.status != 0) {
          alert("ERROR: " + xhttp.status + ": " + xhttp.statusText + " - Double check url provided");
          return;
        }

        xhttp.onerror = function() {
          alert("ERROR: Unable to fetch JSON. The domain entered has either rejected the request, \
is not serving JSON, or is not running a webserver.\n\nA GitHub Gist can be created to host RAW JSON data to prevent this.");
        };
      }
      xhttp.open("GET", url, true);
      xhttp.send();
    }

    /* ******************************************************
     * AJAX 'GET' request from `?url=` parameter
     *
     * Will check the URL during `window.onload` to determine
     * if `?url=` parameter is provided
     * ******************************************************/
    function fetchJsonFromUrl() {
      var url = window.location.href;

      // If `?` is not provided, load page normally
      if (/\?/.test(url)) {
        // Regex to see if `url` parameter has a valid url value
        var regex = /\?url=https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i;
        var res = regex.exec(url);
        if (res != null) {
          // Get the value from the `url` parameter
          let req_url = res[0].substring(5);

          // Fetch JSON from the url
          fetchJsonAjax(req_url, function(content) {
            vizStixWrapper(content)
          });
          linkifyHeader();

        } else {
          alert("ERROR: Invalid url - Request must start with '?url=http[s]://' and be a valid domain");
        }
      }
    }

    function selectedNodeClick() {
      let selected = document.getElementById('selected');
      if (selected.className.indexOf('clicked') === -1) {
        selected.className += " clicked";
        selected.style.position = 'absolute';
        selected.style.left = '25px';
        selected.style.width = (window.innerWidth - 110) + "px";
        selected.style.top = (document.getElementById('canvas').offsetHeight + 25) + "px";
        selected.scrollIntoView(true);
      } else {
        selected.className = "sidebar"
        selected.removeAttribute("style")
      }
    }

    /* ******************************************************
     * When the page is ready, setup the visualization and bind events
     * ******************************************************/
    document.getElementById('files').addEventListener('change', handleFileSelect, false);
    document.getElementById('paste-parser').addEventListener('click', handleTextarea, false);
    document.getElementById('fetch-url').addEventListener('click', handleFetchJson, false);
    document.getElementById('header').addEventListener('click', resetPage, false);
    uploader.addEventListener('dragover', handleDragOver, false);
    uploader.addEventListener('drop', handleFileDrop, false);
    document.getElementById('selected').addEventListener('click', selectedNodeClick, false);
    document.getElementById("legend").addEventListener("click", legendClickHandler, {capture: true});
    document.getElementById("timeline").addEventListener("input", sliderChangeHandler, false);
    document.getElementById("timelineCheckbox").addEventListener("change", sliderChangeHandler, false);

    fetchJsonFromUrl();
});
