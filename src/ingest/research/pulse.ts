import { addRawRecord, addStageItem } from "../../db/ingest.js";
import { documentFromResponseText } from "./documents.js";
import { buildResearchPrompt, normalizeResearchCandidates, researchCandidateDedupeKey } from "./extraction.js";
import { generateOllamaJson } from "./ollama.js";
import { isAllowedResearchUrl, loadResearchWatchlist, type ResearchSourceTier, type ResearchWatchlist } from "./watchlist.js";

type FetchLike = typeof fetch;

export type RunResearchWatchPulseInput = {
  runId: number;
  sourceKey: "research_watch_pulse_fi";
  watchlistPath: string;
  ollamaEndpoint: string;
  ollamaModel: string;
  fetchImpl?: FetchLike;
};

const allowedDomainsForTier = (watchlist: ResearchWatchlist, sourceTier: ResearchSourceTier): string[] => {
  if (sourceTier === "official") {
    return watchlist.officialDomains;
  }
  if (sourceTier === "article") {
    return watchlist.articleDomains;
  }
  return watchlist.partyDomains;
};

export const runResearchWatchPulse = async ({
  runId,
  sourceKey,
  watchlistPath,
  ollamaEndpoint,
  ollamaModel,
  fetchImpl = fetch
}: RunResearchWatchPulseInput): Promise<{ fetchedCount: number; stagedCount: number }> => {
  const watchlist = loadResearchWatchlist(watchlistPath);
  let fetchedCount = 0;
  let stagedCount = 0;

  for (const seed of watchlist.seedUrls.slice(0, Math.floor(watchlist.limits.maxDocumentsPerPulse))) {
    if (!isAllowedResearchUrl(seed.url, allowedDomainsForTier(watchlist, seed.sourceTier))) {
      continue;
    }

    const response = await fetchImpl(seed.url, {
      headers: {
        accept: "text/html,application/json,text/plain",
        "user-agent": "PNYX research watch pulse"
      }
    });
    if (!response.ok) {
      continue;
    }

    const fetchedAt = new Date().toISOString();
    const document = documentFromResponseText({
      sourceUrl: seed.url,
      sourceTier: seed.sourceTier,
      responseText: await response.text(),
      fetchedAt,
      maxResponseBytes: watchlist.limits.maxResponseBytes
    });
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey,
      recordType: "source_document",
      sourceRecordKey: seed.url,
      sourceUrl: seed.url,
      payload: {
        ...document,
        topic: seed.topic
      }
    });
    fetchedCount += 1;

    if (!document.publishedAt) {
      continue;
    }

    const extraction = await generateOllamaJson({
      endpoint: ollamaEndpoint,
      model: ollamaModel,
      timeoutMs: watchlist.limits.fetchTimeoutMs,
      fetchImpl,
      prompt: buildResearchPrompt({
        title: document.title,
        url: document.sourceUrl,
        sourceTier: document.sourceTier,
        text: document.text
      })
    });

    for (const candidate of normalizeResearchCandidates(extraction, watchlist.limits.minimumConfidence, {
      sourceUrl: document.sourceUrl,
      sourceType: document.sourceTier,
      publishedAt: document.publishedAt,
      sourceText: document.text
    })) {
      addStageItem({
        runId,
        rawRecordId,
        stageType: candidate.candidateType,
        sourceKey,
        dedupeKey: researchCandidateDedupeKey(candidate),
        normalized: {
          ...candidate,
          reviewStatus: "pending",
          llmModel: ollamaModel,
          sourceTitle: document.title,
          sourceFetchedAt: document.fetchedAt,
          sourceTopic: seed.topic
        }
      });
      stagedCount += 1;
    }
  }

  return { fetchedCount, stagedCount };
};
