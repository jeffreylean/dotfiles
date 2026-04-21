export function parseFrontmatter(text) {
	if (!text.startsWith("---\n")) return null;
	const end = text.indexOf("\n---\n", 4);
	if (end === -1) return null;

	const raw = text.slice(4, end);
	const data = {};
	for (const line of raw.split("\n")) {
		const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
		if (!match) continue;
		data[match[1]] = match[2];
	}
	return data;
}

export function extractSectionBody(markdown, headingRegex) {
	const match = markdown.match(headingRegex);
	if (!match || match.index === undefined) return "";

	const start = match.index + match[0].length;
	const rest = markdown.slice(start);
	const nextHeading = rest.match(/\n##\s+/);
	return (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
}

export function hasSection(markdown, heading) {
	const regex = new RegExp(`^##\\s+${escapeRegex(heading)}(?:\\s*\\([^)]*\\))?\\s*$`, "m");
	return regex.test(markdown);
}

export function appendSection(markdown, heading, body) {
	const normalized = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
	return `${normalized}\n## ${heading}\n\n${body.trim()}\n`;
}

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
