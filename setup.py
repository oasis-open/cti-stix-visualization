from codecs import open
from setuptools import setup, find_packages

def get_long_description():
    with open('README.Python.rst') as f:
        return f.read()

setup(
    name="stix2-viz",
    description="Visualize STIX content",
    long_description=get_long_description(),
    long_description_content_type='text/x-rst',
    license='BSD',
    url='https://oasis-open.github.io/cti-documentation/',
    author='OASIS Cyber Threat Intelligence Technical Committee',
    author_email='cti-users@lists.oasis-open.org',
    version="0.3.0",
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
