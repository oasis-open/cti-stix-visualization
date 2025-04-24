# cti-stix-visualization

*This is an [OASIS TC Open Repository](https://www.oasis-open.org/resources/open-repositories/). See the [Governance](#governance) section for more information.*

The STIX visualization is meant to provide producers and consumers of STIX content with a rapid way to visualize the objects in a STIX JSON file, and the relationships between those objects. The visualization is implemented in HTML, CSS, and JavaScript (using the [vis.js](https://visjs.org/) library), and is suitable for standalone use — either on a hosted server or as a local file — or embedded into other applications. Regardless of how deployed, the JavaScript code in this repository does not transmit STIX data to any server; it is strictly processed within the browser in which the code is running, so it is suitable for data which the user does not wish to share.

To emphasize, it is 100% browser-based, meaning that you can view a STIX 2.x graph it without sending all your data to the server (great!).

### How does it work?

The source - a file you upload, text you paste, or an external server link is valid JSON.  Run the stix-validator to be sure. For a slightly out-of-date example, look at `test.json`.

Click on nodes or paths to get more detailed information for that element. Click on a STIX type in the Legend to make nodes of that type disappear (or appear).

If you want to load another JSON file, just click on the title at the top of the page ("STIX Visualizer") to go back to the input options.

### How can I use it?

Go to [http://oasis-open.github.io/cti-stix-visualization](http://oasis-open.github.io/cti-stix-visualization). Upload a JSON file, paste some valid JSON text, or provide the URL for an external JSON file. The URL for an external JSON file can be provided on the main page or as a URL parameter: https://oasis-open.github.io/cti-stix-visualization/?url=https://raw.githubusercontent.com/oasis-open/cti-stix-visualization/master/test.json.  To run STIXViz locally see the section below.

#### Customizing the graph's appearance
You can also optionally customize the nodes, text and icons associated with each object type, shown on the graph. The Configuration textarea at the bottom of the page that accepts JSON (format is specified on the visualizer page), allows you to specify a custom icon and/or a custom property to be shown. You can specify one custom icon and/or display property per type of object; you can overwrite the icon and/or text displayed for existing STIX object types, or for your own custom object types. Note that the custom icon must be located in the visualizer's `icons` directory. Alternatively, you can specify the custom icon via a web URL, in which case you must specify the protocol (e.g. https).  Additional customization involves the timeline, which is discussed in the following section.

#### Using the Timeline

Graphs displayed with STIXViz can be unwieldy.  As described above, nodes not of interest can be hidden by using the Legend.  The Timeline feature offers a further option for reducing the nodes and edges that are visible. When a graph is initially displayed, its nodes and edges will be shown according to any customizations, and the timeline selector (shown beneath the graph) will be fully elapsed (expanded all the way to the right).  Sliding the timeline selector left (and right) changes the date of the timeline. By default, the timeline display is cumulative, meaning that nodes and edges with timestamps at or before the timeline date value will be displayed. Unchecking the “Cumulative timeline” option will display only nodes and edges with timestamps matching the specific timeline date. SCOs do not have any timestamp properties themselves but their timestamp may be determined based on their relationship to observed data objects.

### Integrating the visualizer
You can integrate the visualizer into your own web application. The visualizer is implemented as an [AMD](https://en.wikipedia.org/wiki/Asynchronous_module_definition) module that exports a few functions for making the raw graph data and the visualizations. You can visualize your STIX content using code like the following:

```javascript
let [nodeDataSet, edgeDataSet, stixIdToObject]
    = stix2viz.makeGraphData(stixContent, config);

let view = stix2viz.makeGraphView(
    domNode, nodeDataSet, edgeDataSet, stixIdToObject,
    config
);
```

The first step creates the raw graph data, and the second uses that to
create the graph view.  The returned view object is an instance of an
internal class which has some methods useful for eventing, destroying the
view, etc.  See [README.Javascript.rst](README.Javascript.rst) for details.

#### Technical Details

Documenting AMD is beyond the scope of this document.  There are various implementations of it; this repository includes [requirejs](https://requirejs.org/).  Importing and using AMD modules generally looks like:

```javascript
require(["module1", "module2"], function(module1, module2) {
    /* Do stuff with the modules */
});
```

So you need to add your AMD implementation to your web page, and then use modules as above.  With respect to stix2viz, you may need further configuration to ensure the module is found, especially since it was written to work as a Jupyter notebook extension.  You may consult [index.html](index.html) and [application.js](application.js) for inspiration.

### How do I run it locally?

To run a local copy of the STIX visualizer, just point your browser to `index.html` in the top level directory after you clone the STIXViz repository (https://github.com/oasis-open/cti-stix-visualization).  This will open STIXViz running locally in your browser.  

One advantage of running locally is to customize STIXViz more permanently. Customizations made in the configuration textarea are only in effect for that session.  To make more permanent changes to your local STIXViz for some of the customizations, you need to edit the javascript code.  This is often the case when you are using STIX extensions. You need to inform STIXViz what the embedded relationships and timeline timestamp list you want for those extensions.
Make your additions in `stixviz/stixviz/stixviz.js` to the `embeddedRelationships` variable on line 17 and the `timelineTimestamps` constant on line 803.

Additionally, any icons for STIX object extensions should be added to the `stixviz/stixviz/icons` directory.

### Acknowlegements

The icons used in the generated graphs are by Bret Jordan, licensed under the Creative Commons Attribution-ShareAlike (CC BY-SA) License, Version 4.0.

## Governance

This GitHub public repository ( **[https://github.com/oasis-open/cti-stix-visualization](https://github.com/oasis-open/cti-stix-visualization)** ) was [proposed](https://lists.oasis-open.org/archives/cti/201609/msg00001.html) and [approved](https://www.oasis-open.org/committees/ballot.php?id=2971) [[bis](https://issues.oasis-open.org/browse/TCADMIN-2433)] by the [OASIS Cyber Threat Intelligence (CTI) TC](https://www.oasis-open.org/committees/cti/) as an [OASIS TC Open Repository](https://www.oasis-open.org/resources/open-repositories/) to support development of open source resources related to Technical Committee work.

While this TC Open Repository remains associated with the sponsor TC, its development priorities, leadership, intellectual property terms, participation rules, and other matters of governance are [separate and distinct](https://github.com/oasis-open/cti-stix-visualization/blob/master/CONTRIBUTING.md#governance-distinct-from-oasis-tc-process) from the OASIS TC Process and related policies.

All contributions made to this TC Open Repository are subject to open source license terms expressed in the [BSD-3-Clause License](https://www.oasis-open.org/sites/www.oasis-open.org/files/BSD-3-Clause.txt). That license was selected as the declared ["Applicable License"](https://www.oasis-open.org/resources/open-repositories/licenses) when the TC Open Repository was created.

As documented in ["Public Participation Invited](https://github.com/oasis-open/cti-stix-visualization/blob/master/CONTRIBUTING.md#public-participation-invited)", contributions to this OASIS TC Open Repository are invited from all parties, whether affiliated with OASIS or not. Participants must have a GitHub account, but no fees or OASIS membership obligations are required. Participation is expected to be consistent with the [OASIS TC Open Repository Guidelines and Procedures](https://www.oasis-open.org/policies-guidelines/open-repositories), the open source [LICENSE](https://github.com/oasis-open/cti-stix-visualization/blob/master/LICENSE) designated for this particular repository, and the requirement for an [Individual Contributor License Agreement](https://www.oasis-open.org/resources/open-repositories/cla/individual-cla) that governs intellectual property.

### <a id="maintainers">Maintainers</a>

TC Open Repository [Maintainers](https://www.oasis-open.org/resources/open-repositories/maintainers-guide) are responsible for oversight of this project's community development activities, including evaluation of GitHub [pull requests](https://github.com/oasis-open/cti-stix-visualization/blob/master/CONTRIBUTING.md#fork-and-pull-collaboration-model) and [preserving](https://www.oasis-open.org/policies-guidelines/open-repositories#repositoryManagement) open source principles of openness and fairness. Maintainers are recognized and trusted experts who serve to implement community goals and consensus design preferences.

Initially, the associated TC members have designated one or more persons to serve as Maintainer(s); subsequently, participating community members may select additional or substitute Maintainers, per [consensus agreements](https://www.oasis-open.org/resources/open-repositories/maintainers-guide#additionalMaintainers).

**<a id="currentMaintainers">Current Maintainers of this TC Open Repository</a>**

 * [Jason Keirstead](mailto:Jason.Keirstead@ca.ibm.com); GitHub ID: [https://github.com/JasonKeirstead](https://github.com/JasonKeirstead); WWW: [IBM](http://www.ibm.com/)
 * [Emily Ratliff](mailto:Emily.Ratliff@ibm.com); GitHub ID: [https://github.com/ejratl](https://github.com/ejratl); WWW: [IBM](http://www.ibm.com/)
 * [Rich Piazza](mailto:rpiazza@mitre.org); GitHub ID: [https://github.com/rpiazza](https://github.com/rpiazza) WWW: [MITRE](http://www.mitre.org/)


## <a id="aboutOpenRepos">About OASIS TC Open Repositories</a>

  * [TC Open Repositories: Overview and Resources](https://www.oasis-open.org/resources/open-repositories/)
  * [Frequently Asked Questions](https://www.oasis-open.org/resources/open-repositories/faq)
  * [Open Source Licenses](https://www.oasis-open.org/resources/open-repositories/licenses)
  * [Contributor License Agreements (CLAs)](https://www.oasis-open.org/resources/open-repositories/cla)
  * [Maintainers' Guidelines and Agreement](https://www.oasis-open.org/resources/open-repositories/maintainers-guide)

## <a id="feedback">Feedback</a>

Questions or comments about this TC Open Repository's activities should be composed as GitHub issues or comments. If use of an issue/comment is not possible or appropriate, questions may be directed by email to the Maintainer(s) [listed above](#currentMaintainers). Please send general questions about TC Open Repository participation to OASIS Staff at [repository-admin@oasis-open.org](mailto:repository-admin@oasis-open.org) and any specific CLA-related questions to [repository-cla@oasis-open.org](mailto:repository-cla@oasis-open.org).
