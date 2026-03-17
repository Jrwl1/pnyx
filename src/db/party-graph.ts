// WHAT IT DO? Centralizes canonical party graph reads for party list/detail/member endpoints and politician enrichment.
import { db } from "./client.js";

export type PartySummaryRow = {
  id: string;
  name: string;
  shortName: string;
  countryCode: string;
  description: string | null;
  websiteUrl: string | null;
  aliasCount: number;
  memberCount: number;
  currentMemberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PartyAliasRow = {
  id: number;
  partyId: string;
  alias: string;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartyMemberRow = {
  membershipId: number;
  politicianId: number;
  name: string;
  region: string | null;
  office: string | null;
  externalId: string | null;
  partyId: string;
  roleTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
  current: number;
};

export type CurrentPartyContextRow = {
  politicianId: number;
  partyId: string;
  partyName: string;
  partyShortName: string;
};

const partySummarySelect = `
  SELECT p.id,
    p.name,
    p.short_name AS shortName,
    p.country_code AS countryCode,
    p.description,
    p.website_url AS websiteUrl,
    (
      SELECT COUNT(*)
      FROM party_aliases pa
      WHERE pa.party_id = p.id
    ) AS aliasCount,
    (
      SELECT COUNT(*)
      FROM party_memberships pm
      JOIN politicians pol ON pol.id = pm.politician_id
      WHERE pm.party_id = p.id AND pol.deleted_at IS NULL
    ) AS memberCount,
    (
      SELECT COUNT(*)
      FROM party_memberships pm
      JOIN politicians pol ON pol.id = pm.politician_id
      WHERE pm.party_id = p.id AND pm.end_date IS NULL AND pol.deleted_at IS NULL
    ) AS currentMemberCount,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt
  FROM parties p
  WHERE p.deleted_at IS NULL
`;

export const listParties = (): PartySummaryRow[] => {
  return db
    .prepare(`${partySummarySelect} ORDER BY lower(p.short_name), lower(p.name)`)
    .all() as PartySummaryRow[];
};

export const getPartyById = (partyId: string): PartySummaryRow | undefined => {
  return db
    .prepare(`${partySummarySelect} AND p.id = ? LIMIT 1`)
    .get(partyId) as PartySummaryRow | undefined;
};

export const listPartyAliases = (partyId: string): PartyAliasRow[] => {
  return db
    .prepare(
      `SELECT id, party_id AS partyId, alias, source_note AS sourceNote, created_at AS createdAt, updated_at AS updatedAt
       FROM party_aliases
       WHERE party_id = ?
       ORDER BY lower(alias), id`
    )
    .all(partyId) as PartyAliasRow[];
};

export const listPartyMembers = (partyId: string, includeHistorical: boolean): PartyMemberRow[] => {
  const whereSql = includeHistorical ? "" : "AND pm.end_date IS NULL";
  return db
    .prepare(
      `SELECT pm.id AS membershipId,
        pol.id AS politicianId,
        pol.name,
        pol.region,
        pol.office,
        pol.external_id AS externalId,
        pm.party_id AS partyId,
        pm.role_title AS roleTitle,
        pm.start_date AS startDate,
        pm.end_date AS endDate,
        pm.source_note AS sourceNote,
        pm.created_at AS createdAt,
        pm.updated_at AS updatedAt,
        CASE WHEN pm.end_date IS NULL THEN 1 ELSE 0 END AS current
       FROM party_memberships pm
       JOIN politicians pol ON pol.id = pm.politician_id
       WHERE pm.party_id = ? AND pol.deleted_at IS NULL ${whereSql}
       ORDER BY CASE WHEN pm.end_date IS NULL THEN 0 ELSE 1 END,
         COALESCE(pm.end_date, '9999-12-31') DESC,
         COALESCE(pm.start_date, '0000-00-00') DESC,
         pm.id DESC`
    )
    .all(partyId) as PartyMemberRow[];
};

export const listCurrentPartyContexts = (): CurrentPartyContextRow[] => {
  return db
    .prepare(
      `SELECT pm.politician_id AS politicianId,
        p.id AS partyId,
        p.name AS partyName,
        p.short_name AS partyShortName
       FROM party_memberships pm
       JOIN parties p ON p.id = pm.party_id
       JOIN politicians pol ON pol.id = pm.politician_id
       WHERE pm.end_date IS NULL AND p.deleted_at IS NULL AND pol.deleted_at IS NULL`
    )
    .all() as CurrentPartyContextRow[];
};
