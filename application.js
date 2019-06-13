/*
Stix2viz and d3 are packaged in a way that makes them work as Jupyter
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
      "nbextensions/stix2viz/d3": "stix2viz/d3/d3"
    }
});

require(["domReady!", "stix2viz/stix2viz/stix2viz"], function (document, stix2viz) {


    // Init some stuff
    // For optimization purposes, look into moving these to local variables
    var visualizer;
    selectedContainer = document.getElementById('selection');
    uploader = document.getElementById('uploader');
    canvasContainer = document.getElementById('canvas-container');
    canvas = document.getElementById('canvas');
    styles = window.getComputedStyle(uploader);

    /* ******************************************************
     * Resizes the canvas based on the size of the window
     * ******************************************************/
    function resizeCanvas() {
      var cWidth = document.getElementById('legend').offsetLeft - 52;
      var cHeight = window.innerHeight - document.getElementsByTagName('h1')[0].offsetHeight - 27;
      document.getElementById('canvas-wrapper').style.width = cWidth;
      canvas.style.width = cWidth;
      canvas.style.height = cHeight;
    }

    /* ******************************************************
     * Will be called right before the graph is built.
     * ******************************************************/
    function vizCallback() {
      hideMessages();
      resizeCanvas();
    }

    /* ******************************************************
     * Will be called if there's a problem parsing input.
     * ******************************************************/
    function errorCallback() {
      document.getElementById('chosen-files').innerText = "";
      document.getElementById("files").value = "";
    }

    /* ******************************************************
     * Initializes the graph, then renders it.
     * ******************************************************/
    function vizStixWrapper(content, customConfig) {
      cfg = {
        iconDir: "stix2viz/stix2viz/icons"
      }
      visualizer = new stix2viz.Viz(canvas, cfg, populateLegend, populateSelected);
      visualizer.vizStix(content, customConfig, vizCallback, errorCallback);
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

    /* ******************************************************
     * Adds icons and information to the legend.
     *
     * Takes an array of type names as input
     * ******************************************************/
    function populateLegend(typeGroups) {
      var ul = document.getElementById('legend-content');
      var color = d3.scale.category20();
      typeGroups.forEach(function(typeName, index) {
        var li = document.createElement('li');
        var val = document.createElement('p');
        var key = document.createElement('div');
        var keyImg = document.createElement('img');
        keyImg.onerror = function() {
          // set the node's icon to the default if this image could not load
          this.src = visualizer.d3Config.iconDir + "/stix2_custom_object_icon_tiny_round_v1.svg";
        }
        keyImg.src = visualizer.iconFor(typeName);
        keyImg.width = "37";
        keyImg.height = "37";
        keyImg.style.background = "radial-gradient(" + color(index) + " 16px,transparent 16px)";
        key.appendChild(keyImg);
        val.innerText = typeName.charAt(0).toUpperCase() + typeName.substr(1).toLowerCase(); // Capitalize it
        li.appendChild(key);
        li.appendChild(val);
        ul.appendChild(li);
      });
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
        var value = d[key];
        type.innerText = key;
        val.innerText = value;

        // Add new divs to "Selected Node"
        div.appendChild(type);
        div.appendChild(val);
        selectedContainer.appendChild(div);

        // increment the class counter
        counter += 1;
      });
    }

    /* ******************************************************
     * Hides the data entry container and displays the graph
     * container
     * ******************************************************/
    function hideMessages() {
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
        hideMessages();
        visualizer.vizReset();
        document.getElementById('files').value = ""; // reset the files input
        document.getElementById('chosen-files').innerHTML = ""; // reset the subheader text
        document.getElementById('legend-content').innerHTML = ""; // reset the legend in the sidebar
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
        selected.style.top = document.getElementById('legend').offsetHeight + 25;
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
