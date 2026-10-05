When building fine-grained and yet functional root file systems, Chisel creates
this manifest as a way for ensuring file-level integrity and trace all the
installed package slices, in a format that 3rd party tools (such as SBOM
generators and vulnerability scanners) can work with.


(chisel_manifest_location)=

## Location of the manifest

Chisel manifests may be generated anywhere in the newly created root file system.
To specify the location, Chisel must be instructed to install a slice where at least
one of its contents points to a path with the property
