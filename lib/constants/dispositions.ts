import type { Disposition } from "@/types/roadmap";

export interface DispositionMeta {
  label: string;
  description: string;
}

export const DISPOSITION_META: Record<Disposition, DispositionMeta> = {
  Affiliated: {
    label: "Affiliated",
    description:
      "Not connected except the same ownership group. Independent operations with minimal technical overlap.",
  },
  Connected: {
    label: "Connected",
    description:
      "API connections established through our developer platform or other methods. Data exchange enabled between systems.",
  },
  Wrapped: {
    label: "Wrapped",
    description:
      "Keep and use the acquired backend technology but consolidate/wrap the front end into the Capacity console.",
  },
  Migrated: {
    label: "Migrated",
    description:
      "Migrate desired functionality into Capacity. Deprecate or put legacy platform into maintenance mode.",
  },
};
