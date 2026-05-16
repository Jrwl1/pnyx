// WHAT IT DO? Defines the first supported official Finland-first ingest sources and their fetch configuration.

export type SupportedIngestSourceKey = "eduskunta_vote_55554" | "sdp_climate_article_2025_09_04" | "research_watch_pulse_fi";

export type SupportedIngestSource =
  | {
      sourceKey: "eduskunta_vote_55554";
      sourceFamily: "eduskunta_votes";
      voteId: string;
    }
  | {
      sourceKey: "sdp_climate_article_2025_09_04";
      sourceFamily: "party_stance_pages";
      partyId: string;
      issue: string;
      url: string;
      sourceNote: string;
    }
  | {
      sourceKey: "research_watch_pulse_fi";
      sourceFamily: "research_watch_pulse";
      path: string;
      ollamaUrl: string;
      ollamaModel: string;
    };

export const OFFICIAL_INGEST_SOURCES: Record<SupportedIngestSourceKey, SupportedIngestSource> = {
  eduskunta_vote_55554: {
    sourceKey: "eduskunta_vote_55554",
    sourceFamily: "eduskunta_votes",
    voteId: "55554"
  },
  sdp_climate_article_2025_09_04: {
    sourceKey: "sdp_climate_article_2025_09_04",
    sourceFamily: "party_stance_pages",
    partyId: "sdp",
    issue: "Climate and energy",
    url: "https://www.sdp.fi/ajankohtaista/sdpn-eveliina-heinaluoma-ilmastotavoitteet-sailyivat-perussuomalaiset-taipuivat/",
    sourceNote: "Official SDP article"
  },
  research_watch_pulse_fi: {
    sourceKey: "research_watch_pulse_fi",
    sourceFamily: "research_watch_pulse",
    path: "data/research/watchlist.fi.json",
    ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1:8b"
  }
};

export const listSupportedIngestSources = (): SupportedIngestSource[] => {
  return Object.values(OFFICIAL_INGEST_SOURCES);
};

export const getSupportedIngestSource = (sourceKey: string): SupportedIngestSource | null => {
  return OFFICIAL_INGEST_SOURCES[sourceKey as SupportedIngestSourceKey] ?? null;
};
