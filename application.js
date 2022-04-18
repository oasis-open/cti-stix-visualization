/*
Stix2viz and echarts are packaged in a way that makes them work as Jupyter
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
      "nbextensions/stix2viz/echarts": "stix2viz/echarts/echarts"
    }
});

require(["domReady!", "stix2viz/stix2viz/stix2viz"], function (document, stix2viz) {


    // Init some stuff
    let chart = null;
    let selectedContainer = document.getElementById('selection');
    let uploader = document.getElementById('uploader');
    let canvasContainer = document.getElementById('canvas-container');
    let canvas = document.getElementById('canvas');

    /* ******************************************************
     * Resizes the canvas based on the size of the window
     * ******************************************************/
    function resizeCanvas() {
      if (chart)
        chart.resize();
    }


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

        let message = messages.join("\n\n    caused by:\n\n");

        alert(message);
    }


    /* ******************************************************
     * Initializes the graph, then renders it.
     * ******************************************************/
    async function vizStixWrapper(content, customConfig) {

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
            chart = await stix2viz.makeGraph(canvas, content, customConfig);

            chart.on(
                "click",
                {dataType: "node"},
                e => populateSelected(e.data._stixObject)
            );
        }
        catch (err)
        {
            toggleView();
            alertException(err);
        }
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
        customConfig = document.getElementById('paste-area-custom-config').value;
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
      customConfig = document.getElementById('paste-area-custom-config').value;
      content = document.getElementById('paste-area-stix-json').value;
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
      customConfig = document.getElementById('paste-area-custom-config').value;
      fetchJsonAjax(url, function(content) {
        vizStixWrapper(content, customConfig);
      });
      linkifyHeader();
    }

    /**
     * Prettify the given property key and value for display in the object
     * info box.
     */
    function prettyKeyValue(key, value)
    {
        let prettyKey=key, prettyValue=value;

        // I am trying to somewhat mimic what the old visualizer did here...
        if (Array.isArray(value))
        {
            if (key === "kill_chain_phases")
            {
                // Just use phase names of kill chain phases
                let phaseNames = value.map(elt => elt.phase_name);
                prettyValue = phaseNames.join(", ");
            }
            else if (value.length > 0 && (
                    typeof value[0] === "string"
                    || value[0] instanceof String
                )
            )
                // I.e. if value is an array of strings
                prettyValue = value.join(", ");
            else
            {
                // Array of anything else
                let stringValues = value.map(elt => JSON.stringify(elt));
                prettyValue = stringValues.join(", ");
            }
        }
        else if (!(typeof value === "string" || value instanceof String))
            // A non-array, non-string value.  Just run through the
            // JSON stringifier.
            prettyValue = JSON.stringify(value);

        // Old code dropped _ref/_refs suffixes, "_", and capitalized
        prettyKey = key.replace(/_refs?$/, "");
        prettyKey = prettyKey.replaceAll(/_/g, " ");
        if (prettyKey.length > 0)
            prettyKey = prettyKey[0].toUpperCase() + prettyKey.substring(1);

        return [prettyKey, prettyValue];
    }

    /* ******************************************************
     * Adds information to the selected node table.
     *
     * Takes datum as input
     * ******************************************************/
    function populateSelected(d) {
      // Remove old values from HTML
      selectedContainer.innerHTML = "";

      var counter = 0;

      Object.keys(d).forEach(function(key) { // Make new HTML elements and display them
        // Create new, empty HTML elements to be filled and injected
        var div = document.createElement('div');
        var type = document.createElement('div');
        var val = document.createElement('div');

        // Assign classes for proper styling
        if ((counter % 2) != 0) {
          div.classList.add("odd"); // every other row will have a grey background
        }
        type.classList.add("type");
        val.classList.add("value");

        // Add the text to the new inner html elements
        let [prettyKey, prettyValue] = prettyKeyValue(key, d[key]);
        type.innerText = prettyKey;
        val.innerText = prettyValue;

        // Add new divs to "Selected Node"
        div.appendChild(type);
        div.appendChild(val);
        selectedContainer.appendChild(div);

        // increment the class counter
        counter += 1;
      });
    }

    /* ******************************************************
     * Toggle the view between the data entry container and
     * the graph container
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
        if (chart)
        {
            chart.dispose();
            chart = null;
        }
        document.getElementById('files').value = ""; // reset the files input
        document.getElementById('chosen-files').innerHTML = ""; // reset the subheader text
        document.getElementById('selection').innerHTML = ""; // reset the selected node in the sidebar

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
          req_url = res[0].substring(5);

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
      selected = document.getElementById('selected');
      if (selected.className.indexOf('clicked') === -1) {
        selected.className += " clicked";
        selected.style.position = 'absolute';
        selected.style.left = '25px';
        selected.style.width = window.innerWidth - 110;
        selected.style.top = document.getElementById('canvas').offsetHeight + 25;
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
    window.onresize = resizeCanvas;
    document.getElementById('selected').addEventListener('click', selectedNodeClick, false);
    fetchJsonFromUrl();
});
