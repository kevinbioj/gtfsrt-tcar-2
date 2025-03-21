import { serve } from "@hono/node-server";
import { Hono } from "hono/tiny";

import { GTFSRT_TU } from "./constants.js";
import { vehiclePositions } from "./routes/vehicle-positions.js";

const hono = new Hono();
hono.get("/trip-updates", (c) => c.redirect(GTFSRT_TU));
hono.get("/vehicle-positions", vehiclePositions);

serve({ fetch: hono.fetch, port: +(process.env.PORT ?? 3000) }, (info) => {
	console.log("|> Listening on %s:%d", info.address, info.port);
});
