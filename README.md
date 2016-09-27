<div>
<h1>README</h1>

<div>
<h2><a id="readme-general">OASIS Open Repository: cti-stix-visualization</a></h2>

<p>This GitHub public repository ( <b><a href="https://github.com/oasis-open/cti-stix-visualization">https://github.com/oasis-open/cti-stix-visualization</a></b> ) was created at the request of the <a href="https://www.oasis-open.org/committees/cti/">OASIS Cyber Threat Intelligence (CTI) TC</a> as an <a href="https://www.oasis-open.org/resources/open-repositories/">OASIS Open Repository</a> to support development of open source resources related to Technical Committee work.</p>

<p>While this Open Repository remains associated with the sponsor TC, its development priorities, leadership, intellectual property terms, participation rules, and other matters of governance are <a href="https://github.com/oasis-open/cti-stix-visualization/blob/master/CONTRIBUTING.md#governance-distinct-from-oasis-tc-process">separate and distinct</a> from the OASIS TC Process and related policies.</p>

<p>All contributions made to this Open Repository are subject to open source license terms expressed in the <a href="https://www.oasis-open.org/sites/www.oasis-open.org/files/BSD-3-Clause.txt">BSD-3-Clause License</a>.  That license was selected as the declared <a href="https://www.oasis-open.org/resources/open-repositories/licenses">"Applicable License"</a> when the Open Repository was created.</p>

<p>As documented in <a href="https://github.com/oasis-open/cti-stix-visualization/blob/master/CONTRIBUTING.md#public-participation-invited">"Public Participation Invited</a>", contributions to this OASIS Open Repository are invited from all parties, whether affiliated with OASIS or not.  Participants must have a GitHub account, but no fees or OASIS membership obligations are required.  Participation is expected to be consistent with the <a href="https://www.oasis-open.org/policies-guidelines/open-repositories">OASIS Open Repository Guidelines and Procedures</a>, the open source <a href="https://github.com/oasis-open/cti-stix-visualization/blob/master/LICENSE">LICENSE</a> designated for this particular repository, and the requirement for an <a href="https://www.oasis-open.org/resources/open-repositories/cla/individual-cla">Individual Contributor License Agreement</a> that governs intellectual property.</p>

</div>

<div>
<h2><a id="purposeStatement">Statement of Purpose</a></h2>

<p>Statement of Purpose for this OASIS Open Repository (cti-stix-visualization) as <a href="https://lists.oasis-open.org/archives/cti/201609/msg00001.html">proposed</a> and <a href="https://www.oasis-open.org/committees/ballot.php?id=2971">approved</a> [<a href="https://issues.oasis-open.org/browse/TCADMIN-2433">bis</a>] by the TC:</p>

<p>The STIX visualization is meant to provide producers and consumers of STIX content with a rapid way to visualize the objects in a STIX JSON file, and the relationships between those objects. The visualization is implemented in HTML, CSS, and JavaScript (using the <a href="https://d3js.org/">D3.js</a> library), and is suitable for standalone use &mdash; either on a hosted server or as a local file &mdash; or embedded into other applications. Regardless of how deployed, the JavaScript code in this repository does not transmit STIX data to any server; it is strictly processed within the browser in which the code is running, so it is suitable for data which the user does not wish to share.</p>

</div>

<div><h2><a id="purposeClarifications">Additions to Statement of Purpose</a></h2>

Visualizes STIX 2.0 content using d3. It's 100% browser-based, meaning that you
can use it without sending all your data to the server (great!)

### How does it work?

This code makes a lot of assumptions! It assumes:

- The source - a file you upload, text you paste, or an external server -
  provides valid JSON
- That JSON has a bunch of keys and values, some of which are arrays
- Everything inside those arrays is an SDO, with an ID, type, and ideally title

- One of those arrays contains a list of relationships between the other SDOs
  provided.

This should match most STIX 2.0 content inside a package. For a slightly
out-of-date example, look at `test.json`.

### Neat, a graph! What next?

Click on nodes or paths to get more detailed information for that element (and
to pin nodes in place). If you want to unpin a pinned node, double-click it.

If you want to load another JSON file, just click on the title at the top of
the page to go back to the input options.

### How can I use it?

Go to [http://oasis-open.github.io/cti-stix-visualization](http://oasis-open.github.io/cti-stix-vizualization).
Upload a JSON file, paste some valid JSON text, or provide the URL for an
external JSON file. Hope for the best.

### Acknowlegements

The icons used in the generated graphs are by Bret Jordan, licensed under the
Creative Commons Attribution-ShareAlike (CC BY-SA) License, Version 4.0.

</div>

<div>
<h2><a id="maintainers">Maintainers</a></h2>

<p>Open Repository <a href="https://www.oasis-open.org/resources/open-repositories/maintainers-guide">Maintainers</a> are responsible for oversight of this project's community development activities, including evaluation of GitHub <a href="https://github.com/oasis-open/cti-stix-visualization/blob/master/CONTRIBUTING.md#fork-and-pull-collaboration-model">pull requests</a> and <a href="https://www.oasis-open.org/policies-guidelines/open-repositories#repositoryManagement">preserving</a> open source principles of openness and fairness. Maintainers are recognized and trusted experts who serve to implement community goals and consensus design preferences.</p>

<p>Initially, the associated TC members have designated one or more persons to serve as Maintainer(s); subsequently, participating community members may select additional or substitute Maintainers, per <a href="https://www.oasis-open.org/resources/open-repositories/maintainers-guide#additionalMaintainers">consensus agreements</a>.</p>

<p><b><a id="currentMaintainers">Current Maintainers of this Open Repository</a></b></p>

<!-- Initial Maintainers: Greg Back & Ivan Kirillov -->

<ul>

<li><a href="mailto:gback@mitre.org">Greg Back</a>; GitHub ID: <a href="https://github.com/gtback">https://github.com/gtback</a>;  WWW: <a href="https://www.mitre.org">MITRE</a></li>

<li><a href="mailto:ikirillov@mitre.org">Ivan Kirillov</a>; GitHub ID: <a href="https://github.com/ikiril01">https://github.com/ikiril01</a>;  WWW: <a href="https://www.mitre.org">MITRE</a></li>

</ul>

</div>

<div><h2><a id="aboutOpenRepos">About OASIS Open Repositories</a></h2>

<p><ul>
<li><a href="https://www.oasis-open.org/resources/open-repositories/">Open Repositories: Overview and Resources</a></li>
<li><a href="https://www.oasis-open.org/resources/open-repositories/faq">Frequently Asked Questions</a></li>
<li><a href="https://www.oasis-open.org/resources/open-repositories/licenses">Open Source Licenses</a></li>
<li><a href="https://www.oasis-open.org/resources/open-repositories/cla">Contributor License Agreements (CLAs)</a></li>
<li><a href="https://www.oasis-open.org/resources/open-repositories/maintainers-guide">Maintainers' Guidelines and Agreement</a></li>
</ul></p>

</div>

<div><h2><a id="feedback">Feedback</a></h2>

<p>Questions or comments about this Open Repository's activities should be composed as GitHub issues or comments. If use of an issue/comment is not possible or appropriate, questions may be directed by email to the Maintainer(s) <a href="#currentMaintainers">listed above</a>.  Please send general questions about Open Repository participation to OASIS Staff at <a href="mailto:repository-admin@oasis-open.org">repository-admin@oasis-open.org</a> and any specific CLA-related questions to <a href="mailto:repository-cla@oasis-open.org">repository-cla@oasis-open.org</a>.</p>

</div></div>
