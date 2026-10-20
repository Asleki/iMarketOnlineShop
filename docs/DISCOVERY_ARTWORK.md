# Product brand and category artwork

This collection is separate from merchant/shop logos in images/brands/.

- images/product-brands/: the 21 product brands from the verified 210-record selection.
- images/categories/: the 27 catalogue departments, including property departments.
- images/property-types/: additional Apartments, Villas and Detached Houses imagery.
- No property brand is created or assigned.

TopTaste, D&D Foods and Umoja are original generated identities. D$D Foods remains a source-data alias of the D&D Foods display identity; the original catalogue is not rewritten.

Known-brand marks are converted from the published source files and variants specified in data/discovery-artwork-plan.json, preserving proportions and colours. A supplied monochrome mark remains monochrome. These are sourced reproductions, not AI redraws, and are not assertions of endorsement or original trademark ownership. Published source variants can differ from vehicle badges or future rebrands.

Generated property/category scenes are illustrative and location-neutral; they do not represent current stock or a specific parcel/address. The manifest records prompts, source URLs, hashes and dimensions. Brand logos use a white 512px plate so the artwork remains readable in both themes without recolouring.

The repository workflow renders and decodes actual WebP outputs, generates review sheets, runs existing tests and commits outputs back to the rebuild branch. requireComplete becomes true only once all planned source images exist.
