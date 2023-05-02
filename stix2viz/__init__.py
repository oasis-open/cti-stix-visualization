import json


_COUNTER = 0


def display(data, config=None, width=800, height=600):
    """Display visualization in IPython notebook via the HTML display hook"""

    global _COUNTER
    from IPython.display import HTML

    content = str(data).strip()
    if config:
        # Insert the iconDir config setting, so we can get our icons
        config_dict = json.loads(config)
        config_dict["iconDir"] = "/nbextensions/stix2viz/icons"
    else:
        config_dict = {"iconDir": "/nbextensions/stix2viz/icons"}

    config = json.dumps(config_dict)

    h = """
    <div id='chart{id}' style="width:{width}px;height:{height}px;border:solid 1px gray;"></div>

    <script type="text/javascript">
        require(["nbextensions/stix2viz/stix2viz"], function(stix2viz) {{
            chart = $('#chart{id}')[0];
            let [nodeDataSet, edgeDataSet, stixIdToObject]
                = stix2viz.makeGraphData({content}, {config});
            let view = stix2viz.makeGraphView(
                chart, nodeDataSet, edgeDataSet, stixIdToObject,
                {config}
            );
        }});
    </script>
    """.format(
        id=_COUNTER,
        content=content,
        config=config,
        width=width,
        height=height
    )

    _COUNTER += 1
    return HTML(h)


def _jupyter_nbextension_paths():
    """
    Identifies front-end Jupyter notebook extensions bundled with this
    project.

    http://jupyter-notebook.readthedocs.io/en/latest/examples/Notebook/Distributing%20Jupyter%20Extensions%20as%20Python%20Packages.html
    """

    # src/dest are directories relative to the directory containing this
    # module file.  All junk from the src directory is copied into another
    # directory Jupyter will search.  (see 'jupyter --paths')
    #
    # "require" indicates which of the files that were copied over is the
    # javascript AMD module.  One thing I know it's used for is to "validate"
    # the extension: an existence check is done (with ".js" appended onto the
    # end) in Jupyter's various nbextensions directories.  If the file isn't
    # found, validation will fail.
    #
    # I think "section" can be one of ['common', 'notebook', 'tree', 'edit',
    # 'terminal'].  I dunno what they mean.  The examples used "notebook".
    #
    # So the following dumps both visjs and stix2viz into the "stix2viz"
    # extension directory, where they will henceforth be importable (via AMD)
    # as "nbextensions/stix2viz/vis-network" and
    # "nbextensions/stix2viz/stix2viz".  (You can't put them in the same src
    # directory, because you don't seem to be allowed to have more than one AMD
    # module per extension.)
    return [
        {
            "section": "notebook",
            "src": "visjs",
            "dest": "stix2viz",
            "require": "stix2viz/vis-network"
        },
        {
            "section": "notebook",
            "src": "stix2viz",
            "dest": "stix2viz",
            "require": "stix2viz/stix2viz"
        }
    ]
