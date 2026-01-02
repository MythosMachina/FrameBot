export type GearManifest = {
  key: string;
  name: string;
  category: string;
  version: string;
  entry: string;
  permissions: string[];
};

export type GearContext = {
  automatonId: string;
  guildId: string;
  client: unknown;
};

export type GearModule = {
  manifest: GearManifest;
  init: (context: GearContext) => Promise<void>;
  shutdown?: () => Promise<void>;
};
