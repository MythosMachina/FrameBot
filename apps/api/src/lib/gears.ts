import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./prisma";

type DiskManifest = {
  key: string;
  name: string;
  category: string;
  description: string;
  version: string;
  entry: string;
  enabled?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.join(__dirname, "..", "..");
const registryRoot = path.join(packageRoot, "src", "gears");

async function collectManifests(dir: string, manifests: DiskManifest[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectManifests(fullPath, manifests);
      continue;
    }
    if (entry.isFile() && entry.name === "manifest.json") {
      const raw = await fs.readFile(fullPath, "utf8");
      const manifest = JSON.parse(raw) as DiskManifest;
      if (manifest?.key && manifest?.entry) {
        manifests.push(manifest);
      }
    }
  }
}

export async function syncGearsFromDisk() {
  try {
    await fs.access(registryRoot);
  } catch {
    return;
  }

  const manifests: DiskManifest[] = [];
  await collectManifests(registryRoot, manifests);

  for (const manifest of manifests) {
    const enabled = manifest.enabled ?? true;
    const entryPath = path.isAbsolute(manifest.entry)
      ? manifest.entry
      : path.join(packageRoot, manifest.entry);
    await prisma.gear.upsert({
      where: { key: manifest.key },
      create: {
        key: manifest.key,
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        modulePath: entryPath,
        version: manifest.version,
        enabled,
      },
      update: {
        name: manifest.name,
        category: manifest.category,
        description: manifest.description,
        modulePath: entryPath,
        version: manifest.version,
      },
    });
  }
}
