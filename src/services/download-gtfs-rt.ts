import { Buffer } from "node:buffer";

import GtfsRealtime from "gtfs-realtime-bindings";

const { FeedMessage } = GtfsRealtime.transit_realtime;

export async function downloadGtfsRt(href: string) {
	const response = await fetch(href, {
		signal: AbortSignal.timeout(30_000),
	});

	if (!response.ok) {
		throw new Error(`Failed to download GTFS-RT (HTTP ${response.status})`);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	const decoded = FeedMessage.decode(buffer);

	return FeedMessage.toObject(decoded, {
		longs: Number,
	}) as GtfsRealtime.transit_realtime.IFeedMessage;
}
