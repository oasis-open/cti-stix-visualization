// Init some stuff
// MATT: For optimization purposes, look into moving these to local variables
selectedContainer = document.getElementById('selection');
uploader = document.getElementById('uploader');
canvasContainer = document.getElementById('canvas-container');
canvas = document.getElementById('canvas');
styles = window.getComputedStyle(uploader);

/* ******************************************************
 * Resizes the canvas based on the size of the window
 * ******************************************************/
function resizeCanvas() {
  var cWidth = document.getElementById('sidebar').offsetLeft - 52;
  var cHeight = window.innerHeight - document.getElementsByTagName('h1')[0].offsetHeight - 27;
  canvas.style.width = cWidth;
  canvas.style.height = cHeight;
}

/* ******************************************************
 * Will be called right before the graph is built.
 * ******************************************************/
function vizCallback() {
  resizeCanvas();
  hideMessages();
}

/* ******************************************************
 * Initializes the graph, then renders it.
 * ******************************************************/
function vizStixWrapper(content) {
  vizInit(canvas, {}, populateLegend, populateSelected);
  vizStix(content, vizCallback);
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

    var r = new FileReader();
    r.onload = function(e) {vizStixWrapper(e.target.result)};
    r.readAsText(f);
  }
  linkifyHeader();
}
/* ---------------------------------------------------- */

/* ******************************************************
 * Handles content pasted to the text area.
 * ******************************************************/
function handleTextarea() {
  content = document.getElementById('paste-area').value;
  vizStixWrapper(content)
  linkifyHeader();
}

/* ******************************************************
 * Fetches STIX 2.0 data from an external URL (supplied
 * user) via AJAX. Server-side Access-Control-Allow-Origin
 * must allow cross-domain requests for this to work.
 * ******************************************************/
function handleFetchJson() {
  var url = document.getElementById("url").value;
  fetchJsonAjax(url, function(content) {
    vizStixWrapper(content)
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
  typeGroups.forEach(function(typeName) {
    var li = document.createElement('li');
    var val = document.createElement('p');
    var key = document.createElement('div');
    key.style.backgroundImage = "url('icons/stix2_" + typeName.replace(/\-/g, '_') + "_icon_tiny_round_v1.png')";
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
  jsonString = JSON.stringify(d, replacer, 2); // get only the STIX values
  purified = JSON.parse(jsonString); // make a new JSON object from the STIX values
  
  // Remove old values from HTML
  selectedContainer.innerHTML = "";
  
  var counter = 0;
  
  Object.keys(purified).forEach(function(key) { // Make new HTML elements and display them
    var keyString = key;
    if (refRegex.exec(key)) { // key is "created_by_ref"... let's pretty that up
      keyString = key.replace(/_(ref)?/g, " ").trim();
    } else {
      keyString = keyString.replace(/_/g, ' ');
    }
    keyString = keyString.charAt(0).toUpperCase() + keyString.substr(1).toLowerCase() // Capitalize it
    keyString += ":";
    
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

    // Some of the potential values are not very readable (IDs
    // and object references). Let's see if we can fix that.
    var value = purified[key];
    // Lots of assumptions being made about the structure of the JSON here...
    if (Array.isArray(value)) {
      value = value.join(", ")
    } else if (typeof(value) === 'object') {
      value = value.name;
    } else if (/--/.exec(value) && !(keyString === "Id:")) {
      if (!(idCache[value] === null || idCache[value] === undefined)) {
        value = currentGraph.nodes[idCache[value]].name; // IDs are gross, so let's display something more readable if we can (unless it's actually the node id)
      }
    }

    // Add the text to the new inner html elements
    type.innerText = keyString;
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

/* ******************************************************
 * Screens out D3 chart data from the presentation.
 * Called as the 2nd parameter to JSON.stringify().
 * ******************************************************/
function replacer(key, value) {
  var blacklist = ["typeGroup", "index", "weight", "x", "y", "px", "py", "fixed", "dimmed"];
  if (blacklist.indexOf(key) >= 0) {
    return undefined;
  }
  return value;
}

 /* *****************************************************
  * Returns the page to its original load state
  * *****************************************************/
function resetPage() {
  var header = document.getElementById('header');
  if (header.classList.contains('linkish')) {
    hideMessages();
    vizReset();
    document.getElementById('files').value = ""; // reset the files input
    document.getElementById('chosen-files').innerHTML = ""; // reset the subheader text
    document.getElementById('legend-content').innerHTML = ""; // reset the legend in the sidebar

    header.classList.remove('linkish');
  }
}

/* ******************************************************
 * Generic AJAX 'GET' request.
 * 
 * Takes a URL and a callback function as input.
 * ******************************************************/
function fetchJsonAjax(url, cfunc) {
  var xhttp;
  if (window.XMLHttpRequest) {
    xhttp = new XMLHttpRequest();
  } else {
    xhttp = new ActiveXObject("Microsoft.XMLHTTP"); // For IE5 and IE6 luddites
  }
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      cfunc(xhttp.responseText);
    }
  }
  xhttp.open("GET", url, true);
  xhttp.send();
}

/* ******************************************************
 * When the page is ready, setup the visualization and bind events
 * ******************************************************/
document.addEventListener("DOMContentLoaded", function(event) { 
  vizInit(canvas, {}, populateLegend, populateSelected);

  document.getElementById('files').addEventListener('change', handleFileSelect, false);
  document.getElementById('paste-parser').addEventListener('click', handleTextarea, false);
  document.getElementById('fetch-url').addEventListener('click', handleFetchJson, false);
  document.getElementById('header').addEventListener('click', resetPage, false);
  uploader.addEventListener('dragover', handleDragOver, false);
  uploader.addEventListener('drop', handleFileDrop, false);
  window.onresize = resizeCanvas;
});
