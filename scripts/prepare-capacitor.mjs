import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const world = require("world-atlas/countries-110m.json");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const projection = geoEquirectangular().fitExtent(
  [
    [34, 118],
    [966, 562],
  ],
  { type: "Sphere" },
);
const path = geoPath(projection);
const countries = feature(world, world.objects.countries);
const countryMarkup = countries.features
  .map((country) => `<path class="map-country" d="${path(country)}"></path>`)
  .join("");

const template = await readFile(
  join(root, "capacitor", "index.template.html"),
  "utf8",
);
await mkdir(join(root, "dist"), { recursive: true });
await writeFile(
  join(root, "dist", "index.html"),
  template.replace("<!-- COUNTRIES -->", countryMarkup),
);
