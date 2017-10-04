define(["nbextensions/stix2viz/d3"], function(d3) {

    // Init some stuff
    // MATT: For optimization purposes, look into moving these to local variables
    var d3Config;
    var legendCallback;
    var selectedCallback;
    refRegex = /_refs*$/;
    relationshipsKeyRegex = /(r|R)elationships?/; // Added by Matt
    var force; // Determines the "float and repel" behavior of the nodes
    var labelForce; // Determines the "float and repel" behavior of the text labels
    var svgTop;
    var svg;
    var typeGroups = {};
    var typeIndex = 0;

    var currentGraph = {
      nodes: [],
      edges: []
    };
    var labelGraph = {
      nodes: [],
      edges: []
    };

    var idCache = {};

    /* ******************************************************
     * Set up variables to be used by the visualizer.
     *
     * Parameters:
     *     - canvas: <svg> element which will contain the graph
     *     - config: object containing options for the graph:
     *         - color: a d3 color scale
     *         - nodeSize: size of graph nodes, in pixels
     *         - iconSize: size of icon, in pixels
     *         - linkMultiplier: multiplier that affects the length of links between nodes
     *         - width: width of the svg containing the graph
     *         - height: height of the svg containing the graph
     *         - iconDir: directory in which the STIX 2 icons are located
     *     - legendCallback: function that takes an array of type names and create a legend for the graph
     *     - selectedCallback: function that acts on the data of a node when it is selected
     * ******************************************************/
    function vizInit(canvas, config, legendCb, selectedCb) {
      // Set defaults for config if needed
      d3Config = {};
      if (typeof config === 'undefined') config = {};
      if ('color' in config) { d3Config.color = config.color; }
      else { d3Config.color = d3.scale.category20(); }
      if ('nodeSize' in config) { d3Config.nodeSize = config.nodeSize; }
      else { d3Config.nodeSize = 17.5; }
      if ('iconSize' in config) { d3Config.iconSize = config.iconSize; }
      else { d3Config.iconSize = 37; }
      if ('linkMultiplier' in config) { d3Config.linkMultiplier = config.linkMultiplier; }
      else { d3Config.linkMultiplier = 20; }
      if ('width' in config) { d3Config.width = config.width; }
      else { d3Config.width = 900; }
      if ('height' in config) { d3Config.height = config.height; }
      else { d3Config.height = 450; }
      if ('iconDir' in config) { d3Config.iconDir = config.iconDir; }
      else { d3Config.iconDir = "icons"; }

      if (typeof legendCb === 'undefined') { legendCallback = function(){}; }
      else { legendCallback = legendCb; }
      if (typeof selectedCb === 'undefined') { selectedCallback = function(){}; }
      else { selectedCallback = selectedCb; }

      canvas.style.width = d3Config.width;
      canvas.style.height = d3Config.height;
      force = d3.layout.force().charge(-400).linkDistance(d3Config.linkMultiplier * d3Config.nodeSize).size([d3Config.width, d3Config.height]);
      labelForce = d3.layout.force().gravity(0).linkDistance(25).linkStrength(8).charge(-120).size([d3Config.width, d3Config.height]);
      svgTop = d3.select('#' + canvas.id);
      svg = svgTop.append("g");
    }

    /* ******************************************************
     * Attempts to build and display the graph from an
     * arbitrary input string. If parsing the string does not
     * produce valid JSON, fails gracefully and alerts the user.
     *
     * Parameters:
     *     - content: string of valid STIX 2 content
     *     - callback: optional function to call after building the graph
     * ******************************************************/
    function vizStix(content, callback) {
      var parsed;
      if (typeof content === 'string' || content instanceof String) {
        try {
          parsed = JSON.parse(content); // Saving this to a variable stops the rest of the function from executing on parse failure
        } catch (err) {
          alert("Something went wrong!\n\nError:\n" + err);
          return;
        }
      }
      else if (isStixObj(content)) {
        parsed = content;
      }
      else {
        alert("Something went wrong!\n\nError:\n Input is neither parseable JSON nor a STIX object");
        return;
      }
      buildNodes(parsed);
      initGraph();
      if (typeof callback !== 'undefined') callback();
    }

    /* ******************************************************
     * Returns true if the JavaScript object passed in has
     * properties required by all STIX objects.
     * ******************************************************/
    function isStixObj(obj) {
      if ('type' in obj && 'id' in obj && (('created' in obj &&
                          'modified' in obj) || (obj.type === 'bundle'))) {
        return true;
      } else {
        return false;
      }
    }

    /* ******************************************************
     * Generates the components on the chart from the JSON data
     * ******************************************************/
    function initGraph() {
      force.nodes(currentGraph.nodes).links(currentGraph.edges).start();
      labelForce.nodes(labelGraph.nodes).links(labelGraph.edges).start();

      // build the arrow.
      // (Only builds one arrow which is then referenced by the marker-end
      // attribute of the lines)
      // code shamelessly cribbed from: http://stackoverflow.com/questions/28050434/introducing-arrowdirected-in-force-directed-graph-d3
      var defs = svg.append("svg:defs");
      defs.selectAll("marker")
          .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
          .attr("id", String)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", d3Config.nodeSize + 3)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .style("stroke-width", 0)
        .append("svg:path")
          .attr("d", "M0,-5L10,0L0,5");

      // create filter with id #drop-shadow
      // height=130% so that the shadow is not clipped
      var filter = defs.append("filter")
          .attr("id", "drop-shadow")
          .attr("height", "200%")
          .attr("width", "200%")
          .attr("x", "-50%") // x and y have to have negative offsets to
          .attr("y", "-50%"); // stop the edges from getting cut off
      // translate output of Gaussian blur to the right and downwards with 2px
      // store result in offsetBlur
      filter.append("feOffset")
          .attr("in", "SourceAlpha")
          .attr("dx", 0)
          .attr("dy", 0)
          .attr("result", "offOut");
      // SourceAlpha refers to opacity of graphic that this filter will be applied to
      // convolve that with a Gaussian with standard deviation 3 and store result
      // in blur
      filter.append("feGaussianBlur")
          .attr("in", "offOut")
          .attr("stdDeviation", 7)
          .attr("result", "blurOut");
      filter.append("feBlend")
          .attr("in", "SourceGraphic")
          .attr("in2", "blurOut")
          .attr("mode", "normal");

      // Adds style directly because it wasn't getting picked up by the style sheet
      var link = svg.selectAll('path.link').data(currentGraph.edges).enter().append('path')
          .attr('class', 'link')
          .style("stroke", "#aaa")
          .style("stroke-width", "3px")
          .attr("marker-end", "url(#end)")// Add the arrow to the end of the link
          .attr('id', function(d, i) { return "link_" + i; })
          .on('click', function(d, i) { handleSelected(d, this); });

      // Create the text labels that will be attatched to the paths
      var linktext = svg.append("svg:g").selectAll("g.linklabelholder").data(currentGraph.edges);
      linktext.enter().append("g").attr("class", "linklabelholder")
         .append("text")
         .attr("class", "linklabel")
         .style("font-size", "13px")
         .attr("text-anchor", "start")
         .style("fill","#000")
       .append("textPath")
        .attr("xlink:href",function(d,i) { return "#link_" + i;})
        .attr("startOffset", "20%")
        .text(function(d) {
          return d.label;
        });
      var linklabels = svg.selectAll('.linklabel');

      var node = svg.selectAll("g.node")
          .data(currentGraph.nodes)
        .enter().append("g")
          .attr("class", "node")
          .call(force.drag); // <-- What does the "call()" function do?
        node.append("circle")
          .attr("r", d3Config.nodeSize)
          .style("fill", function(d) { return d3Config.color(d.typeGroup); });
        node.append("image")
          .attr("xlink:href", function(d) { return d3Config.iconDir + "/stix2_" + d.type.replace(/\-/g, '_') + "_icon_tiny_round_v1.png"; })
          .attr("x", "-" + (d3Config.nodeSize + 0.5) + "px")
          .attr("y", "-" + (d3Config.nodeSize + 1.5)  + "px")
          .attr("width", d3Config.iconSize + "px")
          .attr("height", d3Config.iconSize + "px");
      node.on('click', function(d, i) { handleSelected(d, this); }); // If they're holding shift, release

      // Fix on click/drag, unfix on double click
      force.drag().on('dragstart', function(d, i) {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        handlePin(d, this, true);
      });//d.fixed = true });
      node.on('dblclick', function(d, i) { handlePin(d, this, false); });//d.fixed = false });

      // Right click will greatly dim the node and associated edges
      // >>>>>>> Does not currently work <<<<<<<
      node.on('contextmenu', function(d) {
        if(d.dimmed) {
          d.dimmed = false; // <-- What is this? Where is this set? How does this work?
          d.attr("class", "node");
        } else {
          d.dimmed = true;
          d.attr("class", "node dimmed");
        }
      });

      var anchorNode = svg.selectAll("g.anchorNode").data(labelForce.nodes()).enter().append("svg:g").attr("class", "anchorNode");
      anchorNode.append("svg:circle").attr("r", 0).style("fill", "#FFF");
            anchorNode.append("svg:text").text(function(d, i) {
            return i % 2 === 0 ? "" : nameFor(d.node);
        }).style("fill", "#555").style("font-family", "Arial").style("font-size", 12);

      // Code in the "tick" function determines where the elements
      // should be redrawn every cycle (essentially, it allows the
      // elements to be animated)
      force.on("tick", function() {

        link.attr("d", function(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y;
            dr = 0; // Change this to make paths curved
        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        });

        node.call(function() {
          this.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          });
        });

        anchorNode.each(function(d, i) {
          labelForce.start();
          if(i % 2 === 0) {
            d.x = d.node.x;
            d.y = d.node.y;
          } else {
            var b = this.childNodes[1].getBBox();

            var diffX = d.x - d.node.x;
            var diffY = d.y - d.node.y;

            var dist = Math.sqrt(diffX * diffX + diffY * diffY);

            var shiftX = b.width * (diffX - dist) / (dist * 2);
            shiftX = Math.max(-b.width, Math.min(0, shiftX));
            var shiftY = 5;
            this.childNodes[1].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
          }
        });

        anchorNode.call(function() {
          this.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          });
        });

        linklabels.attr('transform',function(d,i) {
          if (d.target.x < d.source.x) {
            bbox = this.getBBox();
            rx = bbox.x+bbox.width/2;
            ry = bbox.y+bbox.height/2;
            return 'rotate(180 '+rx+' '+ry+')';
          }
          else {
            return 'rotate(0)';
          }
        });
      });

      // Code to handle zooming and dragging the viewing area
      svgTop.call(d3.behavior.zoom()
        .scaleExtent([0.25, 5])
        .on("zoom", function() {
          svg.attr("transform",
            "translate(" + d3.event.translate + ") " +
            "scale(" + d3.event.scale + ")"
          );
        })
      )
      .on("dblclick.zoom", null);
    }

    /* ******************************************************
     * Screens out D3 chart data from the presentation.
     * Also makes values more readable.
     * Called as the 2nd parameter to JSON.stringify().
     * ******************************************************/
    function replacer(key, value) {
      var blacklist = ["typeGroup", "index", "weight", "x", "y", "px", "py", "fixed", "dimmed"];
      if (blacklist.indexOf(key) >= 0) {
        return undefined;
      }
      // Some of the potential values are not very readable (IDs
      // and object references). Let's see if we can fix that.
      // Lots of assumptions being made about the structure of the JSON here...
      var dictlist = ['definition', 'objects'];
      if (Array.isArray(value)) {
        if (key === 'kill_chain_phases') {
          var newValue = [];
          value.forEach(function (item) {
            newValue.push(item.phase_name)
          });
          return newValue;
        } else if (key === 'granular_markings' || key === 'external_references') {
          var newValue = [];
          value.forEach(function (item) {
            newValue.push(JSON.stringify(item));
          });
          return newValue.join(", ");
        } else {
          return value.join(", ");
        }
      } else if (/--/.exec(value) && !(key === "id")) {
        if (!(idCache[value] === null || idCache[value] === undefined)) {
          // IDs are gross, so let's display something more readable if we can
          // (unless it's actually the node id)
          return currentGraph.nodes[idCache[value]].name;
        }
      } else if (dictlist.indexOf(key) >= 0) {
        return JSON.stringify(value);
      }
      return value;
    }

    /* ******************************************************
     * Adds class "selected" to last graph element clicked
     * and removes it from all other elements.
     *
     * Takes datum and element as input.
     * ******************************************************/
    function handleSelected(d, el) {
      jsonString = JSON.stringify(d, replacer, 2); // get only the STIX values
      purified = JSON.parse(jsonString); // make a new JSON object from the STIX values

      // Pretty up the keys
      for (var key in purified) {
        if (d.hasOwnProperty(key)) {
          var keyString = key;
          if (refRegex.exec(key)) { // key is "created_by_ref"... let's pretty that up
            keyString = key.replace(/_(refs*)?/g, " ").trim();
          } else {
            keyString = keyString.replace(/_/g, ' ');
          }
          keyString = keyString.charAt(0).toUpperCase() + keyString.substr(1).toLowerCase() // Capitalize it
          keyString += ":";

          purified[keyString] = purified[key];
          delete purified[key];
        }
      }

      selectedCallback(purified);
      d3.select('.selected').classed('selected', false);
      d3.select(el).classed('selected', true);
    }

    /* ******************************************************
     * Handles pinning and unpinning of nodes.
     *
     * Takes datum, element, and boolean as input.
     * ******************************************************/
    function handlePin(d, el, pinBool) {
      d.fixed = pinBool;
      d3.select(el).classed("pinned", pinBool);
    }

    /* ******************************************************
     * Parses the JSON input and builds the arrays used by
     * initGraph().
     *
     * Takes a JSON object as input.
     * ******************************************************/
    function buildNodes(package) {
      var relationships = [];
      if(package.hasOwnProperty('objects')) {
        parseSDOs(package['objects']);

        // Get embedded relationships
        package['objects'].forEach(function(item) {
          if (item['type'] === 'relationship') {
            relationships.push(item);
            return;
          }
          if ('created_by_ref' in item) {
            relationships.push({'source_ref': item['id'],
                                'target_ref': item['created_by_ref'],
                                'relationship_type': 'created-by'});
          }
          if ('object_marking_refs' in item) {
            item['object_marking_refs'].forEach(function(markingID) {
              relationships.push({'source_ref': markingID,
                                  'target_ref': item['id'],
                                  'relationship_type': 'applies-to'});
            });
          }
          if ('object_refs' in item) {
            item['object_refs'].forEach(function(objID) {
              relationships.push({'source_ref': item['id'],
                                  'target_ref': objID,
                                  'relationship_type': 'refers-to'});
            });
          }
          if ('sighting_of_ref' in item) {
            relationships.push({'source_ref': item['id'],
                                'target_ref': item['sighting_of_ref'],
                                'relationship_type': 'sighting-of'});
          }
          if ('observed_data_refs' in item) {
            item['observed_data_refs'].forEach(function(objID) {
              relationships.push({'source_ref': item['id'],
                                  'target_ref': objID,
                                  'relationship_type': 'observed'});
            });
          }
          if ('where_sighted_refs' in item) {
            item['where_sighted_refs'].forEach(function(objID) {
              relationships.push({'source_ref': objID,
                                  'target_ref': item['id'],
                                  'relationship_type': 'saw'});
            });
          }
        });
      };

      addRelationships(relationships);

      // Add the legend so we know what's what
      legendCallback(Object.keys(typeGroups));
    }

    /* ******************************************************
     * Adds a name to an SDO Node
     * ******************************************************/
    function nameFor(sdo) {
      if(sdo.type === 'relationship') {
        return "rel: " + (sdo.value);
      } else if (sdo.name !== undefined) {
        return sdo.name;
      } else {
        return sdo.type;
      }
    }

    /* ******************************************************
     * Parses valid SDOs from an array of potential SDO
     * objects (ideally from the data object)
     *
     * Takes an array of objects as input.
     * ******************************************************/
    function parseSDOs(container) {
      var cap = container.length;
      for(var i = 0; i < cap; i++) {
        // So, in theory, each of these should be an SDO. To be sure, we'll check to make sure it has an `id` and `type`. If not, raise an error and ignore it.
        var maybeSdo = container[i];
        if(maybeSdo.id === undefined || maybeSdo.type === undefined) {
          console.error("Should this be an SDO???", maybeSdo);
        } else {
          addSdo(maybeSdo);
        }
      }
    }

    /* ******************************************************
     * Adds an SDO node to the graph
     *
     * Takes a valid SDO object as input.
     * ******************************************************/
    function addSdo(sdo) {
      if(idCache[sdo.id]) {
        console.log("Skipping already added object!", sdo);
      } else if(sdo.type === 'relationship') {
        console.log("Skipping relationship object!", sdo);
      } else {
        if(typeGroups[sdo.type] === undefined) {
          typeGroups[sdo.type] = typeIndex++;
        }
        sdo.typeGroup = typeGroups[sdo.type];

        idCache[sdo.id] = currentGraph.nodes.length; // Edges reference nodes by their array index, so cache the current length. When we add, it will be correct
        currentGraph.nodes.push(sdo);

        labelGraph.nodes.push({node: sdo}); // Two labels will orbit the node, we display the less crowded one and hide the more crowded one.
        labelGraph.nodes.push({node: sdo});

        labelGraph.edges.push({
          source : (labelGraph.nodes.length - 2),
          target : (labelGraph.nodes.length - 1),
          weight: 1
        });
      }
    }

    /* ******************************************************
     * Adds relationships to the graph based on the array of
     * relationships contained in the data.
     *
     * Takes an array as input.
     * ******************************************************/
    function addRelationships(relationships) {
      for(var i = 0; i < relationships.length; i++) {
        var rel = relationships[i];
        if(idCache[rel.source_ref] === null || idCache[rel.source_ref] === undefined) {
          console.error("Couldn't find source!", rel);
        } else if (idCache[rel.target_ref] === null || idCache[rel.target_ref] === undefined) {
          console.error("Couldn't find target!", rel);
        } else {
          currentGraph.edges.push({source: idCache[rel.source_ref], target: idCache[rel.target_ref], label: rel.relationship_type});
        }
      }
    }

    /* ******************************************************
     * Resets the graph so it can be rebuilt
     * *****************************************************/
    function vizReset() {
      typeGroups = {};
      typeIndex = 0;

      currentGraph = {
        nodes: [],
        edges: []
      };
      labelGraph = {
        nodes: [],
        edges: []
      };

      idCache = {};

      force.stop();
      labelForce.stop();
      svg.remove();
    }

    module = {
        "vizInit": vizInit,
        "vizReset": vizReset,
        "vizStix": vizStix
    };

    return module;
});
