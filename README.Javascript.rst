.. contents::

================
Javascript Usage
================

The STIX Visualizer is written in Javascript (the small bit of Python is for
integration into Jupyter).  This file documents the Javascript module.

Library Design
==============

STIX is a graph-like data model.  This library is designed to visualize STIX
content in the natural way, as a graph.  It converts STIX content into a set of
nodes and a set of edges.

The library separates the creation of graph data (as converted from STIX
content) from how that data is visualized.  This allows for different
views of the same graph data.  If there is a lot of STIX content for example, a
visual graph rendering may be too cluttered or may not perform well.  The
primary rendering of the graph data is intended to be a graph.  But alternative
views may be more suitable under some circumstances.

Two view implementations are included.  There is a graph view based on
`visjs <https://visjs.org/>`_, and a simpler textual list view which just puts
graph data into a simple HTML list.

Javascript API
==============

The ``stix2viz`` module exports the following functions:

- ``makeGraphData(stixContent, config)``
- ``makeGraphView(domElement, nodeDataSet, edgeDataSet, stixIdToObject, config)``
- ``makeListView(domElement, nodeDataSet, edgeDataSet, stixIdToObject, config)``

The configuration object which is the last parameter of all of these functions
is documented in the `configuration <Configuration_>`_ section.

Making Graph Data
-----------------

The first step to visualizing STIX content using this library, is to create the
base graph data.  This is done with ``makeGraphData``.  It accepts STIX content
in a few different forms, including a single STIX object, array of objects,
or bundle of objects, as JSON text, plain Javascript object, array, or Map.

The function returns a 3-tuple,
:code:`[nodeDataSet, edgeDataSet, stixIdToObject]`.  The first two elements are
`DataSet <https://visjs.github.io/vis-data/data/dataset.html>`_ objects with
the graph data; the last contains the same STIX content as was passed in, but
in a normalized form, to simplify handling.  The normalized form is a Map
instance which maps STIX IDs to Map instances containing the data for each
STIX object.  All nested mappings are recursively converted to Map instances as
necessary.

Making a View
-------------

Creation of a view is done within the context of a web page.  One element from
the web page must be chosen to act as the root of the content which will
comprise the view.  The ``makeGraphView`` or ``makeListView`` function is
called with this root element, all the values obtained from making the graph
data, and a configuration object.  The view should automatically appear in the
web page (depending on its styling).

These functions return instances of internal classes: the classes themselves
are not exported, but the functions act as factories for them.  There are some
utility methods defined on the classes, e.g. a ``destroy()`` method
for destroying the view and releasing resources.

Configuration
=============

All three of the public API functions accept a configuration object.  Different
library components require different types of configuration, but it can all
co-exist within the same object.  The components will look for and use whatever
settings they need.

Configuration can be given as JSON text, a plain Javascript object, or a Map.
A few top-level keys map to various types of config settings, described in
the following subsections.

Per STIX Type Settings
----------------------

Some settings are naturally organized per STIX type, e.g. how one labels graph
nodes corresponding to particular STIX types.  One can use the STIX type as a
top-level configuration key, and map to type-specific settings:

.. code:: JSON

    {
        "<stix_type>": {
            "displayProperty": "<prop_name>",
            "displayIcon": "<icon_file_name>",
            "embeddedRelationships": ["...relationships..."]
        }
    }

The meanings are as follows:

- ``displayProperty`` names a top-level property of STIX objects of the given
  type.  The value of that property is used as the graph node label for nodes
  corresponding to STIX objects of this type.  If an
  `object-specific <Per STIX Object Settings_>`_ label is given, it will
  override this setting.
- ``displayIcon`` gives a URL to an icon file to use for this STIX type.  This
  would be most relevant for graphical visualizations which use icons.  Both
  library included views use this to create a legend: the legend will display
  icons even though the list view is textual.
- ``embeddedRelationships`` describes what embedded relationships should be
  converted to graph edges, and how to create the edges.  The value of this
  property is an array of length-three arrays::

      ["<property_path>", "<edge_label>", true]

  The first element is a `property path <Property Paths_>`_ which should
  identify a _ref(s) property in objects of that type.  The second is a label
  to use for the edges, and the third element is a boolean which determines the
  directionality of the resulting edges.  If ``true``, the edge direction will
  be referrer -> referent; otherwise, the direction will be the reverse.

``displayProperty`` and ``embeddedRelationships`` are used only when creating
graph data.  ``displayIcon`` is used only in the views.


Per STIX Object Settings
------------------------

There is one config section which contains object-specific settings:
``userLabels``.  It allows users to directly label individual STIX objects.
It is a mapping from STIX ID to label:

.. code:: JSON

    {
        "userLabels": {
            "identity--349fbdc2-959e-4f76-9a44-256e226419ba": "Bob"
        }
    }

This overrides per-type label settings.

STIX Object Filtering
---------------------

It is possible to include or exclude STIX objects from being used to create
graph data, on the basis of some criteria:

.. code:: JSON

    {
        "include": "<criteria>",
        "exclude": "<criteria>"
    }

``include`` is used to describe which STIX objects to include; ``exclude``
is used to describe which STIX objects to exclude.  Users can choose one of
these, depending on what is most natural for their usage.  It is also possible
to include both settings.  If both are included, STIX objects are included
which match ``include`` *and* do not match ``exclude``.

How to express the criteria is described in the next section.

STIX Object Match Criteria
~~~~~~~~~~~~~~~~~~~~~~~~~~

These criteria are intended to support a true/false match capability on STIX
objects.  The design is based on Mongo queries, but is not the same.

A set of criteria is expressed as a mapping.  Each entry in the mapping
represents sub-criteria, and the sub-criteria represented by all map entries
are implicitly AND'd.  At the top level, property path criteria and logical
operators are most useful.  At nested levels, one can use value and presence
criteria as well.

Value Criteria
^^^^^^^^^^^^^^

Value criteria express a comparison directly on some value.  With respect to
STIX objects, this type of criteria is not useful at the top level because
useful checks against whole objects (and arrays) are not defined.  They are
only useful at nested levels, applied to simple values.  Value criteria can be
given as a plain value, which acts as an equality check, or a mapping with an
operator which maps to an operand value.

For example:

.. code:: JSON

    { "$gt": 80 }

An example of usage of the above value criterion is:

.. code:: JSON

    {
        "confidence": { "$gt": 80 }
    }

This matches objects with a confidence value greater than 80.  One could use
``$eq`` to perform an equality check, or use 80 directly as the value
criterion, which means the same thing.

Supported value criterion operators include: ``$eq``, ``$gt``, ``$gte``,
``$in``, ``$lt``, ``$lte``, ``$ne``, ``$nin``.  ``$in`` and ``$nin`` must map
to arrays, since they mean "in" and "not in" the given array.

Property Path Criteria
^^^^^^^^^^^^^^^^^^^^^^

A property path criterion maps a property path to some sub-criteria.  The
property path acts as a kind of "selector" of values from the object (or some
sub-object).  These values are checked against the sub-criteria, and the
results are OR'd.

For example, given object:

.. code:: JSON

    {
        "foo": [
            {"bar": 1},
            {"bar": 2}
        ]
    }

Criteria:

.. code:: JSON

    {
        "foo.bar": 1
    }

will produce a match.  The "foo.bar" property path selects values 1 and 2, and
1 as the mapped criterion is a value sub-criterion which acts as a direct
equality check with that value (using the Javascript "===" operator).  These
checks are implicitly OR'd, so the net result is equivalent to
(1 === 1 || 2 === 1).

Logical Operator Criteria
^^^^^^^^^^^^^^^^^^^^^^^^^

Logical operator criteria are map entries with keys ``$and``, ``$or``, or
``$not``.  They behave as one would expect: the first two must map to arrays
of criteria; the last maps to a single criterion.

``$not`` deserves some special discussion.  It causes evaluation of the mapped
criterion, and simply inverts the result.  It does *not* invert any nested
operators, so it can result in subtle behavioral differences as compared to
an inverted operator.  For example, given object:

.. code:: JSON

    {
        "foo": [1, 2]
    }

The following criteria produce results as shown:

- :code:`{"foo": {"$in": [2, 3]}}`: match
- :code:`{"foo": {"$nin": [2, 3]}}`: match
- :code:`{"foo": {"$not": {"$in": [2, 3]}}}`: no match

The first is equivalent to (1 in [2, 3]) OR (2 in [2, 3]), which is true; the
second is equivalent to (1 not in [2, 3]) OR (2 not in [2, 3]) which is also
true; and the last is the inversion of the first, so it is false.

The second is checking for a value not in [2, 3], whereas the last is
effectively ensuring that *none* of the values are in [2, 3], and those are
different criteria.

Presence Criteria
^^^^^^^^^^^^^^^^^

There is one presence criterion, which occurs when a map key is ``$exists``.
It only makes sense nested directly under a property path criterion, and is
intended to act as a property presence check.  It can't be quite that simple
though, because a property *path* isn't as simple as a plain property name.
So this criterion has a more general behavior, but acts as expected when the
property path has only one component (is just a property name).

The ``$exists`` key must map to a boolean.  If it maps to true, the criterion
matches if the property path selects any values from the object.  If it maps
to false, the criterion matches if the property path selects nothing from the
object.

For example, given object:

.. code:: JSON

    {
        "foo": [
            {"bar": 1},
            {"bar": 2}
        ]
    }

The following criteria produce results as shown:

- :code:`{"foo": {"$exists": true}}`: match
- :code:`{"bar": {"$exists": false}}`: match
- :code:`{"foo.bar": {"$exists": false}}`: no match

Property Paths
--------------

Property paths are used in various places in the configuration settings to
identify parts of STIX objects.  They can also be seen as "selectors" of
sub-components of a given object.  If array-valued properties are present, a
single property path may identify multiple parts of the same object.  Property
paths are designed to be transparent to arrays.  There is no way to identify a
particular element of an array in a property path.

Property paths are strings in a particular syntax.  That syntax is a sequence
of property names separated by dots.  Property paths shouldn't begin or end
with a dot, there should be no adjacent dots, and the path should not be empty.
Property names can't contain dots; there is no escaping.  But this should be
okay since STIX property names should not contain dots.

For example, given structure:

.. code:: JSON

    {
        "a": [
            {"b": 1},
            {
                "b": {
                    "c": [2, 3]
                }
            }
        ]
    }

Paths and selected sub-components include:

- "a" -> {"b": 1}, {"b": {"c": [2, 3]}}  (two results)
- "a.b" -> 1, {"c": [2, 3]} (two results)
- "a.b.c" -> 2, 3 (two results)
- "a.b.c.d" -> (no results)

Notice that if the property path refers to an array (i.e. the last path
component names an array-valued property), it does not select the array itself,
it selects the individual elements of the array.  If those individual elements
are themselves arrays, they are presently *not* searched.  I.e. if the path
refers to an array, the resulting selection is not as if the array was
flattened.
