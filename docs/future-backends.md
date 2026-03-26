# Future Backends

## Live Three.js backgrounds

The correct future shape is:

- a background operator graph produces either raster layers, vector layers, point fields, or scene descriptors
- a Three.js adapter can render one kind of scene descriptor for interactive preview
- the layout engine still resolves text, logo, and safe-area composition independently
- a compositor combines background and layout outputs into a scene layer stack

This means a future project can import a live Three.js background without coupling layout logic to Three internals.

## Vector export

SVG should be a dedicated backend that consumes resolved placements, text runs, and vector shapes.

Do not make the browser editor SVG-first just to get export.

## Print and CMYK

CMYK should be handled as export intent, not preview truth.

Short term fallback:

- controlled color replacement or mapping during export
- PDF generation pipeline outside the preview runtime

Long term:

- proper PDF backend
- separations and preflight
- EPS only if a downstream workflow still requires it