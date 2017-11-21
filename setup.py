from setuptools import setup, find_packages

setup(
    name="stix2-viz",
    description="Visualize STIX content",
    version="0.1",
    packages=find_packages(),
    install_requires=["jupyter>=1.0.0"],
    package_data={
        "stix2viz": [
            "d3/*",
            "stix2viz/icons/*",
            "stix2viz/stix2viz.js",
        ],
    }
)
