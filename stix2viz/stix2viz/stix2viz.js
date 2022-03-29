

define(["nbextensions/stix2viz/d3", "../../lib/stix2vizcore"], function(d3, initVis) {
  return {Viz: initVis.default(d3)}; 
}); 