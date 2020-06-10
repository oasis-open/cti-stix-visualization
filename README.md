# cti-stix-visualization

*This is an [OASIS TC Open Repository](https://www.oasis-open.org/resources/open-repositories/). See the [Governance](#governance) section for more information.*

The STIX visualization is meant to provide producers and consumers of STIX content with a rapid way to visualize the objects in a STIX JSON file, and the relationships between those objects. The visualization is implemented in HTML, CSS, and JavaScript (using the [D3.js](https://d3js.org/) library), and is suitable for standalone use — either on a hosted server or as a local file — or embedded into other applications. Regardless of how deployed, the JavaScript code in this repository does not transmit STIX data to any server; it is strictly processed within the browser in which the code is running, so it is suitable for data which the user does not wish to share.

It visualizes STIX 2.0 content using d3, and is 100% browser-based, meaning that you can use it without sending all your data to the server (great!)

### How does it work?

This code makes a lot of assumptions! It assumes:

- The source - a file you upload, text you paste, or an external server - provides valid JSON
- That JSON has a bunch of keys and values, some of which are arrays
- Everything inside those arrays is an SDO, with an ID, type, and ideally title
- One of those arrays contains a list of relationships between the other SDOs provided

This should match most STIX 2.0 content inside a bundle. For a slightly out-of-date example, look at `test.json`.

### Neat, a graph! What next?

Click on nodes or paths to get more detailed information for that element (and to pin nodes in place). If you want to unpin a pinned node, double-click it.

If you want to load another JSON file, just click on the title at the top of the page to go back to the input options.

### How can I use it?

Go to [http://oasis-open.github.io/cti-stix-visualization](http://oasis-open.github.io/cti-stix-visualization). Upload a JSON file, paste some valid JSON text, or provide the URL for an external JSON file. The URL for an external JSON file can be provided on the main page or as a URL parameter: https://oasis-open.github.io/cti-stix-visualization/?url=https://raw.githubusercontent.com/oasis-open/cti-stix-visualization/master/test.json.

#### Customizing the graph's appearance
You can also optionally customize the text and icons associated with each object type, shown on the graph. There is a separate field that accepts JSON (format is specified on the visualizer page), and allows you to specify a custom icon and/or a custom property to be shown. You can specify one custom icon and/or display property per type of object; you can overwrite the icon and/or text displayed for existing STIX object types, or for your own custom object types. Note that the custom icon must be located in the visualizer's `icons` directory. Alternatively, you can specify the custom icon via a web URL, in which case you must specify the protocol (e.g. https).

#### Integrating the visualizer
You can integrate the visualizer into your own web application. The visualizer is implemented as an [AMD](https://en.wikipedia.org/wiki/Asynchronous_module_definition) module that exports the `Viz` class. You can create a new `Viz` instance and visualize your STIX content using code like the following:

```javascript
visualizer = new stix2viz.Viz(mySvgElement);
visualizer.vizStix(content);
```

Finally, you can use `visualizer.vizReset()` if you need to clear the graph.

#### Technical Details

Documenting AMD is beyond the scope of this document.  There are various implementations of it; this repository includes [requirejs](https://requirejs.org/).  Importing and using AMD modules generally looks like:

```javascript
require(["module1", "module2"], function(module1, module2) {
    /* Do stuff with the modules */
});
```

So you need to add your AMD implementation to your web page, and then use modules as above.  With respect to stix2viz, you may need further configuration to ensure the module is found, especially since it was written to work as a Jupyter notebook extension.  You may consult [index.html](index.html) and [application.js](application.js) for inspiration.

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

  * [Chris Lenk](mailto:clenk@mitre.org); GitHub ID: [https://github.com/clenk](https://github.com/clenk); WWW: [MITRE](https://www.mitre.org)
 * [Jason Keirstead](mailto:Jason.Keirstead@ca.ibm.com); GitHub ID: [https://github.com/JasonKeirstead](https://github.com/JasonKeirstead); WWW: [IBM](http://www.ibm.com/)

## <a id="aboutOpenRepos">About OASIS TC Open Repositories</a>

  * [TC Open Repositories: Overview and Resources](https://www.oasis-open.org/resources/open-repositories/)
  * [Frequently Asked Questions](https://www.oasis-open.org/resources/open-repositories/faq)
  * [Open Source Licenses](https://www.oasis-open.org/resources/open-repositories/licenses)
  * [Contributor License Agreements (CLAs)](https://www.oasis-open.org/resources/open-repositories/cla)
  * [Maintainers' Guidelines and Agreement](https://www.oasis-open.org/resources/open-repositories/maintainers-guide)

## <a id="feedback">Feedback</a>

Questions or comments about this TC Open Repository's activities should be composed as GitHub issues or comments. If use of an issue/comment is not possible or appropriate, questions may be directed by email to the Maintainer(s) [listed above](#currentMaintainers). Please send general questions about TC Open Repository participation to OASIS Staff at [repository-admin@oasis-open.org](mailto:repository-admin@oasis-open.org) and any specific CLA-related questions to [repository-cla@oasis-open.org](mailto:repository-cla@oasis-open.org).
