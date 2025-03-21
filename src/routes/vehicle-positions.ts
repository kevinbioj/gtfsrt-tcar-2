import GtfsRealtime from "gtfs-realtime-bindings";
import type { Context } from "hono";
import { stream } from "hono/streaming";
import { match } from "ts-pattern";

import { GTFSRT_VP } from "../constants.js";
import { downloadGtfsRt } from "../services/download-gtfs-rt.js";
import { fetchFlowlySeverities } from "../services/flowly.js";

const { OccupancyStatus } = GtfsRealtime.transit_realtime.VehiclePosition;

export async function vehiclePositions(c: Context) {
	const payload = await downloadGtfsRt(GTFSRT_VP);
	const severities = await fetchFlowlySeverities();

	for (const entity of payload.entity ?? []) {
		if (typeof entity.vehicle?.vehicle?.id !== "string") continue;

		const severity = severities.get(entity.vehicle.vehicle.id);
		entity.vehicle.occupancyStatus = match(severity)
			.with("GREEN", () => OccupancyStatus.MANY_SEATS_AVAILABLE)
			.with("ORANGE", () => OccupancyStatus.FEW_SEATS_AVAILABLE)
			.with("RED", () => OccupancyStatus.FULL)
			.otherwise(() => undefined);
	}

	return stream(c, async (stream) => {
		const encoded =
			GtfsRealtime.transit_realtime.FeedMessage.encode(payload).finish();
		await stream.write(encoded);
	});
}
