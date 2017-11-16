README
======

This repository contains a Python package `stix2viz` for enabling visualization
of STIX 2 content within Jupyter notebooks.

Installation
------------

1. ``pip install stix2-viz`` (this won't work until the package is actually
    published to PyPI).
2. ``jupyter nbextension install stix2viz --py``
3. ``jupyter nbextension enable stix2viz --py``

Usage
-----

In a notebook cell, run the following code:

.. code-block:: python

    import requests
    import stix2viz

    data = requests.get("https://raw.githubusercontent.com/oasis-open/cti-stix-visualization/master/test.json").content
    stix2viz.display(data)


The ``display`` function can take either a JSON string, or a python-stix2 object.

Uninstall
---------

1. ``jupyter nbextension uninstall stix2viz --py``
