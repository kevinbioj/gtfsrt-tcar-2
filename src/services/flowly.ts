import { match } from "ts-pattern";
import { FLOWLY_MAP } from "../constants.js";

type FlowlySeverity = "GREEN" | "ORANGE" | "RED";
type FlowlyValue = { severity: FlowlySeverity; updatedAt: number };

const cache = new Map<string, FlowlyValue>();
let updatedAt: number;

const freshValues = () =>
	cache.entries().reduce((map, [id, { severity, updatedAt }]) => {
		if (Date.now() - updatedAt > 120_000) return map;

		map.set(id, severity);
		return map;
	}, new Map<string, FlowlySeverity>());

export async function fetchFlowlySeverities() {
	if (typeof updatedAt !== "undefined" && Date.now() - updatedAt < 30_000) {
		return freshValues();
	}

	try {
		const response = await fetch(FLOWLY_MAP, {
			signal: AbortSignal.timeout(30_000),
		});
		if (!response.ok) return freshValues();
		updatedAt = Date.now();

		const html = await response.text();
		const values = htmlToMap(html);
		values.forEach((severity, id) =>
			cache.set(id, {
				severity,
				updatedAt: Date.now(),
			}),
		);
	} catch {}

	return freshValues();
}

// ---

const vehicleIdPattern = /( \d+ )/;

export function htmlToMap(html: string) {
	const scriptLines = html
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.startsWith("vehicles."));

	const map = new Map<string, FlowlySeverity>();

	for (const scriptLine of scriptLines) {
		const matched = vehicleIdPattern.exec(scriptLine);
		if (matched === null) continue;

		const vehicleId = matched[1]?.trim();
		if (typeof vehicleId === "undefined") continue;

		const deviceId = scriptLine.slice(
			scriptLine.indexOf("<b>") + 3,
			scriptLine.indexOf("</b>"),
		);

		const loadLine = scriptLines.find((line) =>
			line.startsWith(`vehicles.set('${deviceId}_load'`),
		);
		if (typeof loadLine === "undefined") continue;

		const backgroundColorIndex = loadLine.indexOf("background-color:#");
		if (backgroundColorIndex === -1) continue;

		const rawColor = loadLine.slice(
			backgroundColorIndex + 18,
			backgroundColorIndex + 24,
		);
		const color = match(rawColor)
			.with("1cc88a", () => "GREEN" as const)
			.with("f6c23e", () => "ORANGE" as const)
			.with("e74a3b", () => "RED" as const)
			.otherwise(() => undefined);

		if (typeof color === "undefined") continue;
		console.log(`${new Date().toISOString()} |> ${vehicleId} = ${color}`);
		map.set(vehicleId, color);
	}

	return map;
}
