from setuptools import setup, find_packages

setup(
    name="stix-visualization",
    description="Visualize STIX content",
    version="1.0",
    packages=find_packages(),
    install_requires=["jupyter>=1.0.0"],
    package_data={
        "stix2jupyter": ["stix2viz/icons/*"],
    }
)
