// WHAT IT DO? Fetches and normalizes the first supported official Finland-first source set into raw and staged ingest records.

import { addRawRecord, addStageItem, createIngestRun, markIngestRunStatus } from "../db/ingest.js";
import { runResearchWatchPulse } from "./research/pulse.js";
import { getSupportedIngestSource, listSupportedIngestSources, type SupportedIngestSourceKey } from "./sources.js";

type FetchLike = typeof fetch;

type AdapterResult = {
  fetchedCount: number;
  stagedCount: number;
};

const EDSKUNTA_API_BASE = "https://avoindata.eduskunta.fi/api/v1/tables";

const fetchJson = async (url: string, fetchImpl: FetchLike): Promise<unknown> => {
  const response = await fetchImpl(url, { headers: { accept: "application/json", "user-agent": "PNYX ingest bot" } });
  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} for ${url}`);
  }
  return response.json();
};

const fetchText = async (url: string, fetchImpl: FetchLike): Promise<string> => {
  const response = await fetchImpl(url, { headers: { "user-agent": "PNYX ingest bot" } });
  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} for ${url}`);
  }
  return response.text();
};

const mapRow = (columnNames: string[], rowData: string[]): Record<string, string> => {
  return Object.fromEntries(columnNames.map((columnName, index) => [columnName, rowData[index] ?? ""]));
};

const extractMetaContent = (html: string, kind: "property" | "name", value: string): string | null => {
  const patterns = [
    new RegExp(`<meta[^>]+${kind}="${value}"[^>]+content="([^"]+)"`, "i"),
    new RegExp(`<meta[^>]+content="([^"]+)"[^>]+${kind}="${value}"`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
};

const extractTitle = (html: string): string | null => {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
};

const stageEduskuntaVote = async (
  sourceKey: string,
  runId: number,
  voteId: string,
  fetchImpl: FetchLike
): Promise<AdapterResult> => {
  const eventUrl = `${EDSKUNTA_API_BASE}/SaliDBAanestys/rows?columnName=AanestysId&columnValue=${encodeURIComponent(voteId)}&perPage=1`;
  const eventPayload = (await fetchJson(eventUrl, fetchImpl)) as {
    columnNames: string[];
    rowData: string[][];
  };
  if (!eventPayload.rowData?.[0]) {
    throw new Error(`official vote event ${voteId} not found`);
  }
  const eventRow = mapRow(eventPayload.columnNames, eventPayload.rowData[0]);
  const eventRawRecordId = addRawRecord({
    runId,
    sourceFamily: "eduskunta_votes",
    sourceKey,
    recordType: "vote_event",
    sourceRecordKey: voteId,
    sourceUrl: eventUrl,
    payload: eventRow
  });

  const eventSourcePath = eventRow.Url?.trim() || "";
  const eventStageId = addStageItem({
    runId,
    rawRecordId: eventRawRecordId,
    stageType: "vote_event",
    sourceKey,
    dedupeKey: `vote_event:${voteId}`,
    normalized: {
      externalKey: `eduskunta:${voteId}`,
      countryCode: "FI",
      institutionName: "Eduskunta",
      issue: eventRow.PaaKohtaOtsikko?.trim() || eventRow.KohtaOtsikko?.trim() || null,
      title: eventRow.AanestysOtsikko?.trim() || `Eduskunta vote ${voteId}`,
      sourceUrl: eventSourcePath ? `https://avoindata.eduskunta.fi${eventSourcePath}` : eventUrl,
      sourceNote: eventRow.AanestysPoytakirja?.trim() || null,
      eventDate: (eventRow.IstuntoPvm ?? "").slice(0, 10),
      voteId
    }
  });

  const recordUrl = `${EDSKUNTA_API_BASE}/SaliDBAanestysEdustaja/rows?columnName=AanestysId&columnValue=${encodeURIComponent(voteId)}&perPage=250`;
  const recordPayload = (await fetchJson(recordUrl, fetchImpl)) as {
    columnNames: string[];
    rowData: string[][];
  };

  let fetchedCount = 1;
  let stagedCount = 1;
  for (const row of recordPayload.rowData ?? []) {
    const record = mapRow(recordPayload.columnNames, row);
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "eduskunta_votes",
      sourceKey,
      recordType: "vote_record",
      sourceRecordKey: record.EdustajaId,
      sourceUrl: recordUrl,
      payload: record
    });

    const voteValueRaw = (record.EdustajaAanestys ?? "").trim().toLowerCase();
    const voteValue =
      voteValueRaw.startsWith("jaa")
        ? "for"
        : voteValueRaw.startsWith("ei")
          ? "against"
          : voteValueRaw.startsWith("tyh")
            ? "abstain"
            : "absent";

    addStageItem({
      runId,
      rawRecordId,
      stageType: "vote_record",
      sourceKey,
      dedupeKey: `vote_record:${voteId}:${record.EdustajaHenkiloNumero?.trim()}`,
      normalized: {
        voteEventExternalKey: `eduskunta:${voteId}`,
        politicianExternalId: record.EdustajaHenkiloNumero?.trim() || null,
        politicianName: `${record.EdustajaEtunimi?.trim() ?? ""} ${record.EdustajaSukunimi?.trim() ?? ""}`.trim(),
        partyShortName: record.EdustajaRyhmaLyhenne?.trim() || null,
        voteValue,
        sourceNote: `Official Eduskunta vote ${voteId}`
      }
    });
    fetchedCount += 1;
    stagedCount += 1;
  }

  void eventStageId;
  return { fetchedCount, stagedCount };
};

const stagePartyStancePage = async (
  sourceKey: string,
  runId: number,
  config: {
    partyId: string;
    issue: string;
    url: string;
    sourceNote: string;
  },
  fetchImpl: FetchLike
): Promise<AdapterResult> => {
  const html = await fetchText(config.url, fetchImpl);
  const title = extractMetaContent(html, "property", "og:title") ?? extractTitle(html) ?? config.url;
  const description = extractMetaContent(html, "property", "og:description") ?? "";
  const published = extractMetaContent(html, "property", "article:published_time");
  if (!published) {
    throw new Error(`party stance source ${config.url} is missing article:published_time`);
  }

  const rawRecordId = addRawRecord({
    runId,
    sourceFamily: "party_stance_pages",
    sourceKey,
    recordType: "party_stance_page",
    sourceRecordKey: config.url,
    sourceUrl: config.url,
    payload: {
      title,
      description,
      published,
      html
    }
  });

  addStageItem({
    runId,
    rawRecordId,
    stageType: "party_stance",
    sourceKey,
    dedupeKey: `party_stance:${config.url}`,
    normalized: {
      partyId: config.partyId,
      issue: config.issue,
      stanceText: description ? `${title}\n\n${description}` : title,
      sourceUrl: config.url,
      sourceNote: config.sourceNote,
      dateSaid: published.slice(0, 10)
    }
  });

  return { fetchedCount: 1, stagedCount: 1 };
};

export const runOfficialSourceImport = async (
  sourceKey: SupportedIngestSourceKey,
  triggeredBy: string,
  fetchImpl: FetchLike = fetch
): Promise<{ runId: number }> => {
  const config = getSupportedIngestSource(sourceKey);
  if (!config) {
    throw new Error(`unsupported source key: ${sourceKey}`);
  }

  const runId = createIngestRun({
    sourceFamily: config.sourceFamily,
    sourceKey: config.sourceKey,
    sourceUrl: "url" in config ? config.url : null,
    triggeredBy
  });

  try {
    const result =
      config.sourceFamily === "eduskunta_votes"
        ? await stageEduskuntaVote(config.sourceKey, runId, config.voteId, fetchImpl)
        : config.sourceFamily === "research_watch_pulse"
          ? await runResearchWatchPulse({
              runId,
              sourceKey: config.sourceKey,
              watchlistPath: config.path,
              ollamaEndpoint: config.ollamaUrl,
              ollamaModel: config.ollamaModel,
              fetchImpl
            })
          : await stagePartyStancePage(config.sourceKey, runId, config, fetchImpl);
    markIngestRunStatus(runId, {
      status: "staged",
      fetchedCount: result.fetchedCount,
      stagedCount: result.stagedCount
    });
    return { runId };
  } catch (err) {
    markIngestRunStatus(runId, {
      status: "failed",
      errorMessage: (err as Error).message || "ingest failed"
    });
    throw err;
  }
};

export const listOfficialSourceSummaries = (): Array<{ sourceKey: string; sourceFamily: string; label: string }> => {
  return listSupportedIngestSources().map((source) => ({
    sourceKey: source.sourceKey,
    sourceFamily: source.sourceFamily,
    label:
      source.sourceFamily === "eduskunta_votes"
        ? `Eduskunta vote ${source.voteId}`
        : source.sourceFamily === "research_watch_pulse"
          ? "Research watch pulse FI"
        : `${source.partyId.toUpperCase()} party stance page`
  }));
};
