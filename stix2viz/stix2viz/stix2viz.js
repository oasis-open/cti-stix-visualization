define(["nbextensions/stix2viz/d3"], function(d3) {

    refRegex = /_refs*$/;

    /* ******************************************************
     * Viz class constructor.
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
    function Viz(canvas, config, legendCb, selectedCb) {
        // Init some stuff
        this.d3Config;
        this.customConfig;
        this.legendCallback;
        this.selectedCallback;
        this.force; // Determines the "float and repel" behavior of the nodes
        this.labelForce; // Determines the "float and repel" behavior of the text labels
        this.svgTop;
        this.svg;
        this.typeGroups = {};
        this.typeIndex = 0;

        this.currentGraph = {
          nodes: [],
          edges: []
        };
        this.labelGraph = {
          nodes: [],
          edges: []
        };

        this.idCache = {};
        // Set defaults for config if needed
        this.d3Config = {};
        if (typeof config === 'undefined') config = {};
        if ('color' in config) { this.d3Config.color = config.color; }
        else { this.d3Config.color = d3.scale.category20(); }
        if ('nodeSize' in config) { this.d3Config.nodeSize = config.nodeSize; }
        else { this.d3Config.nodeSize = 17.5; }
        if ('iconSize' in config) { this.d3Config.iconSize = config.iconSize; }
        else { this.d3Config.iconSize = 37; }
        if ('linkMultiplier' in config) { this.d3Config.linkMultiplier = config.linkMultiplier; }
        else { this.d3Config.linkMultiplier = 20; }
        if ('width' in config) { this.d3Config.width = config.width; }
        else { this.d3Config.width = 900; }
        if ('height' in config) { this.d3Config.height = config.height; }
        else { this.d3Config.height = 450; }
        if ('iconDir' in config) { this.d3Config.iconDir = config.iconDir; }
        else { this.d3Config.iconDir = "icons"; }
        // To differentiate multiple graphs on same page
        if ('id' in config) { this.id = config.id; }
        else { this.id = 0; }

        if (typeof legendCb === 'undefined') { this.legendCallback = function(){}; }
        else { this.legendCallback = legendCb; }
        if (typeof selectedCb === 'undefined') { this.selectedCallback = function(){}; }
        else { this.selectedCallback = selectedCb; }

        // keys are the name of the _ref/s property, values are the name of the
        // relationship and whether the object with that property should be the
        // source_ref in the relationship
        this.refsMapping = {
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
        }

        canvas.style.width = this.d3Config.width;
        canvas.style.height = this.d3Config.height;
        this.force = d3.layout.force().charge(-400).linkDistance(this.d3Config.linkMultiplier * this.d3Config.nodeSize).size([this.d3Config.width, this.d3Config.height]);
        this.labelForce = d3.layout.force().gravity(0).linkDistance(25).linkStrength(8).charge(-120).size([this.d3Config.width, this.d3Config.height]);
        this.svgTop = d3.select('#' + canvas.id);
        this.svg = this.svgTop.append("g");
    };

    /* ******************************************************
     * Attempts to build and display the graph from an
     * arbitrary input string. If parsing the string does not
     * produce valid JSON, fails gracefully and alerts the user.
     *
     * Parameters:
     *     - content: string of valid STIX 2 content
     *     - config: 
     *     - callback: optional function to call after building the graph
     *     - onError: optional function to call if an error is encountered while parsing input
     * ******************************************************/
    Viz.prototype.vizStix = function(content, config, callback, onError) {
      try {
        // Saving this to a variable stops the rest of the function from executing on parse failure
        parsed = this.parseContent(content);
      }
      catch (err) {
        alert("Something went wrong!\n\nError:\n" + err);
        if (typeof onError !== 'undefined') onError();
        return;
      }

      try {
        if (config !== undefined && config !== "") {
          this.customConfig = JSON.parse(config);
        }
      } catch (err) {
        alert("Something went wrong!\nThe custom config does not seem to be proper JSON.\nPlease fix or remove it and try again.\n\nError:\n" + err);
        if (typeof onError !== 'undefined') onError();
        return;
      }

      this.buildNodes(parsed);
      this.initGraph();
      if (typeof callback !== 'undefined') callback();
    };

    Viz.prototype.parseContent = function(content) {
      if (typeof content === 'string' || content instanceof String) {
        return this.parseContent(JSON.parse(content));
      }
      else if (content.constructor === Array) {
        if (this.arrHasAllStixObjs(content)) {
          return {
            "objects": content
          };
        }
        else {
          throw "Input contains one or more invalid STIX objects";
        }
      }
      else if (this.isStixObj(content)) {
        if (content.type == "bundle") {
          return content;
        } else {
          return {
            "objects": [content]
          };
        }
      }
      else {
        throw "Input is neither parseable JSON nor a STIX object";
      }
    };

    /* ******************************************************
     * Returns true if the JavaScript object passed in has
     * properties required by all STIX objects.
     * ******************************************************/
    Viz.prototype.isStixObj = function(obj) {
      if ('type' in obj && 'id' in obj) {
        return true;
      } else {
        return false;
      }
    };

    /* ******************************************************
     * Returns true if the JavaScript array passed in has
     * only objects such that each object has properties
     * required by all STIX objects.
     * ******************************************************/
    Viz.prototype.arrHasAllStixObjs = function(arr) {
      return arr.reduce((accumulator, currentObj) => {
        return accumulator && (this.isStixObj(currentObj));
      }, true);
    };

    /* ******************************************************
     * Generates the components on the chart from the JSON data
     * ******************************************************/
    Viz.prototype.initGraph = function() {
      var _this = this;
      this.force.nodes(this.currentGraph.nodes).links(this.currentGraph.edges).start();
      this.labelForce.nodes(this.labelGraph.nodes).links(this.labelGraph.edges).start();

      // create filter with id #drop-shadow
      // height=130% so that the shadow is not clipped
      var filter = this.svg.append("svg:defs").append("filter")
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
      var link = this.svg.selectAll('path.link').data(this.currentGraph.edges).enter().append('path')
          .attr('class', 'link')
          .style("stroke", "#aaa")
          .style('fill', "#aaa")
          .style("stroke-width", "3px")
          .attr('id', function(d, i) { return "link" + _this.id + "_" + i; })
          .on('click', function(d, i) { handleSelected(d, this); });

      // Create the text labels that will be attatched to the paths
      var linktext = this.svg.append("svg:g").selectAll("g.linklabelholder").data(this.currentGraph.edges);
      linktext.enter().append("g").attr("class", "linklabelholder")
         .append("text")
         .attr("class", "linklabel")
         .style("font-size", "13px")
         .attr("text-anchor", "start")
         .style("fill","#000")
       .append("textPath")
        .attr("xlink:href",function(d,i) { return "#link" + _this.id + "_" + i;})
        .attr("startOffset", "20%")
        .text(function(d) {
          return d.label;
        });
      var linklabels = this.svg.selectAll('.linklabel');

      var node = this.svg.selectAll("g.node")
          .data(this.currentGraph.nodes)
        .enter().append("g")
          .attr("class", "node")
          .call(this.force.drag); // <-- What does the "call()" function do?
        node.append("circle")
          .attr("r", this.d3Config.nodeSize)
          .style("fill", function(d) { return _this.d3Config.color(d.typeGroup); });
      var nodeIcon = node.append("image")
          .attr("x", "-" + (this.d3Config.nodeSize + 0.5) + "px")
          .attr("y", "-" + (this.d3Config.nodeSize + 1.5)  + "px")
          .attr("width", this.d3Config.iconSize + "px")
          .attr("height", this.d3Config.iconSize + "px");
      nodeIcon.each(function(d) {
          _this.setNodeIcon(d3.select(this), d.type);
      });
      node.on('click', function(d, i) { _this.handleSelected(d, this); }); // If they're holding shift, release

      // Fix on click/drag, unfix on double click
      this.force.drag().on('dragstart', function(d, i) {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        _this.handlePin(d, this, true);
      });//d.fixed = true });
      node.on('dblclick', function(d, i) { _this.handlePin(d, this, false); });//d.fixed = false });

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

      var anchorNode = this.svg.selectAll("g.anchorNode").data(this.labelForce.nodes()).enter().append("svg:g").attr("class", "anchorNode");
      anchorNode.append("svg:circle").attr("r", 0).style("fill", "#FFF");
            anchorNode.append("svg:text").text(function(d, i) {
            return i % 2 === 0 ? "" : _this.nameFor(d.node, _this.customConfig);
        }).style("fill", "#555").style("font-family", "Arial").style("font-size", 12);

      // Code in the "tick" function determines where the elements
      // should be redrawn every cycle (essentially, it allows the
      // elements to be animated)
      this.force.on("tick", function() {

        link.attr("d", function(d) { return _this.drawArrow(d); });

        node.call(function() {
          this.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          });
        });

        anchorNode.each(function(d, i) {
          _this.labelForce.start();
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
      this.svgTop.call(d3.behavior.zoom()
        .scaleExtent([0.25, 5])
        .on("zoom", function() {
          _this.svg.attr("transform",
            "translate(" + d3.event.translate + ") " +
            "scale(" + d3.event.scale + ")"
          );
        })
      )
      .on("dblclick.zoom", null);
    };

    /* ******************************************************
     * Draws an arrow between two points.
     * ******************************************************/
    Viz.prototype.drawArrow = function(d) {
      return this.drawLine(d) + this.drawArrowHead(d);
    };

    /* ******************************************************
     * Draws a line between two points
     * ******************************************************/
    Viz.prototype.drawLine = function(d) {
      return this.startAt(d.source) + this.lineTo(d.target);
    };

    /* ******************************************************
     * Draws an arrow head.
     * ******************************************************/
    Viz.prototype.drawArrowHead = function(d) {
      var arrowTipPoint = this.calculateArrowTipPoint(d);
      return this.startAt(arrowTipPoint)
        + this.lineTo(this.calculateArrowBaseRightCornerPoint(d, arrowTipPoint))
        + this.lineTo(this.calculateArrowBaseLeftCornerPoint(d, arrowTipPoint))
        + this.lineTo(arrowTipPoint)
        + this.closePath();
    };

    /* ******************************************************
     * Creates the SVG for a starting point.
     * ******************************************************/
    Viz.prototype.startAt = function(startPoint) {
      return 'M' + startPoint.x + ',' + startPoint.y;
    };

    /* ******************************************************
     * Creates the SVG for line to a point.
     * ******************************************************/
    Viz.prototype.lineTo = function(endPoint) {
      return 'L' + endPoint.x + ',' + endPoint.y;
    };

    /* ******************************************************
     * Calculates the point at which the arrow tip should be.
     * ******************************************************/
    Viz.prototype.calculateArrowTipPoint = function(d) {
      var nodeRadius = Math.max(this.d3Config.iconSize, this.d3Config.nodeSize) / 2;
      return this.translatePoint(d.target, this.calculateUnitVectorAlongLine(d), -(this.d3Config.nodeSize + 3));
    };

    /* ******************************************************
     * Calculates the point at which the right corner of the
     * base of the arrow head should be.
     * ******************************************************/
    Viz.prototype.calculateArrowBaseRightCornerPoint = function(d, arrowTipPoint) {
      var arrowBaseWidth = 13;
      var unitVector = this.calculateUnitVectorAlongLine(d);
      var arrowBasePoint = this.calculateArrowBaseCentrePoint(d, arrowTipPoint);
      return this.translatePoint(arrowBasePoint, this.calculateNormal(unitVector), -arrowBaseWidth / 2);
    };

    /* ******************************************************
     * Calculates the point at which the left corner of the
     * base of the arrow head should be.
     * ******************************************************/
    Viz.prototype.calculateArrowBaseLeftCornerPoint = function(d, arrowTipPoint) {
      var arrowBaseWidth = 13;
      var unitVector = this.calculateUnitVectorAlongLine(d);
      var arrowBasePoint = this.calculateArrowBaseCentrePoint(d, arrowTipPoint);
      return this.translatePoint(arrowBasePoint, this.calculateNormal(unitVector), arrowBaseWidth / 2);
    };

    /* ******************************************************
     * Calculates the point at the centre of the base of the
     * arrow head.
     * ******************************************************/
    Viz.prototype.calculateArrowBaseCentrePoint = function(d, arrowTipPoint) {
      var arrowHeadLength = 13;
      return this.translatePoint(arrowTipPoint, this.calculateUnitVectorAlongLine(d), -arrowHeadLength);
    };

    /* ******************************************************
     * Translates a point.
     * ******************************************************/
    Viz.prototype.translatePoint = function(startPoint, directionUnitVector, distance) {
      return { x: startPoint.x + distance * directionUnitVector.x, y: startPoint.y + distance * directionUnitVector.y };
    };

    /* ******************************************************
     * Calculates a unit vector along a particular line.
     * ******************************************************/
    Viz.prototype.calculateUnitVectorAlongLine = function(d) {
      var dx = d.target.x - d.source.x;
      var dy = d.target.y - d.source.y;
      var dr = Math.sqrt(dx * dx + dy * dy);
      return { x: dx / dr, y: dy / dr };
    };

    /* ******************************************************
     * Calculates a normal to a unit vector.
     * ******************************************************/
    Viz.prototype.calculateNormal = function(unitVector) {
      return { x: -unitVector.y, y: unitVector.x };
    };

    /* ******************************************************
     * Closes an SVG path.
     * ******************************************************/
    Viz.prototype.closePath = function() {
      return 'Z';
    };

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
        if (!(this.idCache[value] === null || this.idCache[value] === undefined)) {
          // IDs are gross, so let's display something more readable if we can
          // (unless it's actually the node id)
          return this.currentGraph.nodes[this.idCache[value]].name;
        }
      } else if (dictlist.indexOf(key) >= 0) {
        return JSON.stringify(value);
      }
      return value;
    };

    /* ******************************************************
     * Adds class "selected" to last graph element clicked
     * and removes it from all other elements.
     *
     * Takes datum and element as input.
     * ******************************************************/
    Viz.prototype.handleSelected = function(d, el) {
      var selectedReplacer = replacer.bind(this);
      jsonString = JSON.stringify(d, selectedReplacer, 2); // get only the STIX values
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

      this.selectedCallback(purified);
      d3.select('.selected').classed('selected', false);
      d3.select(el).classed('selected', true);
    };

    /* ******************************************************
     * Handles pinning and unpinning of nodes.
     *
     * Takes datum, element, and boolean as input.
     * ******************************************************/
    Viz.prototype.handlePin = function(d, el, pinBool) {
      d.fixed = pinBool;
      d3.select(el).classed("pinned", pinBool);
    };

    /* ******************************************************
     * Parses the JSON input and builds the arrays used by
     * initGraph().
     *
     * Takes a JSON object as input.
     * ******************************************************/
    Viz.prototype.buildNodes = function(package) {
      var _this = this;
      var relationships = [];
      if(package.hasOwnProperty('objects')) {
        this.parseSDOs(package['objects']);

        // Get embedded relationships
        package['objects'].forEach(function(item) {
          if (item['type'] === 'relationship') {
            relationships.push(item);
            return;
          }
          Object.keys(item).forEach(function(key, index) {
            if (key.endsWith("_ref") && _this.refsMapping.hasOwnProperty(key)) {
              var source = (_this.refsMapping[key][1] === true) ? item["id"] : item[key];
              var target = (_this.refsMapping[key][1] === true) ? item[key] : item["id"];
              var relType = _this.refsMapping[key][0];
              relationships.push({'source_ref': source,
                                  'target_ref': target,
                                  'relationship_type': relType});
            }
            else if (key.endsWith("_refs") && _this.refsMapping.hasOwnProperty(key)) {
              item[key].forEach(function(refID) {
                var source = (_this.refsMapping[key][1] === true) ? item["id"] : refID;
                var target = (_this.refsMapping[key][1] === true) ? refID : item["id"];
                var relType = _this.refsMapping[key][0];
                relationships.push({'source_ref': source,
                                    'target_ref': target,
                                    'relationship_type': relType});
              });
            }
          });
        });
      };

      this.addRelationships(relationships);

      // Add the legend so we know what's what
      this.legendCallback(Object.keys(this.typeGroups));
    };

    /* ******************************************************
     * Uses regex to check whether the specified value for
     *  display_icon in customConfig is a valid URL.
     *
     * Note: The protocol MUST be supplied in the image URL
     *  (e.g. https)
     *
     * The regex expression below is based on:
     * https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url 
     * ******************************************************/
    Viz.prototype.validUrl = function(imageUrl) {
      var pattern = new RegExp('^(https?:\\/\\/)'+ // protocol
                           '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
                           '((\\d{1,3}\\.){3}\\d{1,3}))'+ // ip (v4) address
                           '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ //port
                           '(\\?[;&amp;a-z\\d%_.~+=-]*)?'+ // query string
                           '(\\#[-a-z\\d_]*)?$','i');
      return pattern.test(imageUrl);
    };

    /* ******************************************************
     * Returns the name to use for an SDO Node
     *
     * Determines what name to use in the following order:
     * 1) A display_property set in the config
     * 2) The SDO's "name" property
     * 3) the SDO's "value" property
     * 4) the SDO's "type" property
     * ******************************************************/
    Viz.prototype.nameFor = function(sdo) {
      if (this.customConfig !== undefined && sdo.type in this.customConfig) {
        let customStr = sdo[this.customConfig[sdo.type].display_property];

        if (customStr.length <= 100) { return customStr; }
        else { return customStr.substr(0,100) + '...'; } // For space-saving
      } else if (sdo.name !== undefined) {
        return sdo.name;
      } else if (sdo.value !== undefined) {
        return sdo.value;
      } else {
        return sdo.type;
      }
    };

    /* ******************************************************
     * Returns the icon to use for an SDO Node
     *
     * Determines which icon to use in the following order:
     * 1) A display_icon set in the config (must be in the icon directory)
     * 2) A default icon for the SDO type, bundled with this library
     * ******************************************************/
    Viz.prototype.iconFor = function(typeName) {
      if (this.customConfig !== undefined && typeName in this.customConfig) {
        let customIcon = this.customConfig[typeName].display_icon;
        if (customIcon !== undefined) {
          if (this.validUrl(customIcon)) {
            return customIcon;
          } else {
            typeIcon = this.d3Config.iconDir + '/' + customIcon;
            return typeIcon;
          }
        }
      }
      if (typeName !== undefined) {
        typeIcon = this.d3Config.iconDir + "/stix2_" + typeName.replace(/\-/g, '_') + "_icon_tiny_round_v1.png";
        return typeIcon;
      }
    };

    /* ******************************************************
     * Sets the icon on a STIX object node
     *
     * If the image doesn't load properly, a default 'custom object'
     * icon will be used instead
     * ******************************************************/
    Viz.prototype.setNodeIcon = function(node, stixType) {
      var _this = this;
      var tmpImg = new Image();
      tmpImg.onload = function() {
        // set the node's icon to this image if it loaded properly
        node.attr("xlink:href", tmpImg.src);
      }
      tmpImg.onerror = function() {
        // set the node's icon to the default if this image could not load
        node.attr("xlink:href", _this.d3Config.iconDir + "/stix2_custom_object_icon_tiny_round_v1.svg")
      }
      tmpImg.src = _this.iconFor(stixType, _this.customConfig);
    };

    /* ******************************************************
     * Parses valid SDOs from an array of potential SDO
     * objects (ideally from the data object)
     *
     * Takes an array of objects as input.
     * ******************************************************/
    Viz.prototype.parseSDOs = function(container) {
      var cap = container.length;
      for(var i = 0; i < cap; i++) {
        // So, in theory, each of these should be an SDO. To be sure, we'll check to make sure it has an `id` and `type`. If not, raise an error and ignore it.
        var maybeSdo = container[i];
        if(maybeSdo.id === undefined || maybeSdo.type === undefined) {
          console.error("Should this be an SDO???", maybeSdo);
        } else {
          this.addSdo(maybeSdo);
        }
      }
    };

    /* ******************************************************
     * Adds an SDO node to the graph
     *
     * Takes a valid SDO object as input.
     * ******************************************************/
    Viz.prototype.addSdo = function(sdo) {
      if(this.idCache[sdo.id]) {
        console.log("Skipping already added object!", sdo);
      } else if(sdo.type === 'relationship') {
        console.log("Skipping relationship object!", sdo);
      } else {
        if(this.typeGroups[sdo.type] === undefined) {
          this.typeGroups[sdo.type] = this.typeIndex++;
        }
        sdo.typeGroup = this.typeGroups[sdo.type];

        this.idCache[sdo.id] = this.currentGraph.nodes.length; // Edges reference nodes by their array index, so cache the current length. When we add, it will be correct
        this.currentGraph.nodes.push(sdo);

        this.labelGraph.nodes.push({node: sdo}); // Two labels will orbit the node, we display the less crowded one and hide the more crowded one.
        this.labelGraph.nodes.push({node: sdo});

        this.labelGraph.edges.push({
          source : (this.labelGraph.nodes.length - 2),
          target : (this.labelGraph.nodes.length - 1),
          weight: 1
        });
      }
    };

    /* ******************************************************
     * Adds relationships to the graph based on the array of
     * relationships contained in the data.
     *
     * Takes an array as input.
     * ******************************************************/
    Viz.prototype.addRelationships = function(relationships) {
      for(var i = 0; i < relationships.length; i++) {
        var rel = relationships[i];
        if(this.idCache[rel.source_ref] === null || this.idCache[rel.source_ref] === undefined) {
          console.error("Couldn't find source!", rel);
        } else if (this.idCache[rel.target_ref] === null || this.idCache[rel.target_ref] === undefined) {
          console.error("Couldn't find target!", rel);
        } else {
          this.currentGraph.edges.push({source: this.idCache[rel.source_ref], target: this.idCache[rel.target_ref], label: rel.relationship_type});
        }
      }
    };

    /* ******************************************************
     * Resets the graph so it can be rebuilt
     * *****************************************************/
    Viz.prototype.vizReset = function() {
      this.typeGroups = {};
      this.typeIndex = 0;

      this.currentGraph = {
        nodes: [],
        edges: []
      };
      this.labelGraph = {
        nodes: [],
        edges: []
      };

      this.idCache = {};

      this.force.stop();
      this.labelForce.stop();
      this.svg.remove();
    };

    module = {
        "Viz": Viz
    };

    return module;
});
