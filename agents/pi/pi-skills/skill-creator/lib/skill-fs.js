import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export async function existsPath(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

export async function listJsFilesRecursive(dir) {
	const results = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await listJsFilesRecursive(full)));
			continue;
		}
		if (entry.isFile() && entry.name.endsWith(".js")) {
			results.push(full);
		}
	}
	return results;
}
