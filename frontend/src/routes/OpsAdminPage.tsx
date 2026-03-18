/* WHAT IT DO? Exposes protected admin forms for party identity, alias, membership, and direct canonical-promise maintenance. */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  createCanonicalPromise,
  createParty,
  createPartyAlias,
  createPartyMembership,
  getPartyMembers,
  listCanonicalPromises,
  listParties,
  listPoliticians,
  listStatements,
  updatePartyMembership
} from "../lib/api";
import { formatIdentityLine } from "../lib/format";
import type { BackendPartyMember, CanonicalPromiseSummary, Politician, StatementSummary } from "../types";

const asPositiveInt = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const emptyPartyForm = () => ({
  id: "",
  name: "",
  shortName: "",
  countryCode: "FI",
  description: "",
  websiteUrl: ""
});

const emptyAliasForm = () => ({
  partyId: "",
  alias: "",
  sourceNote: ""
});

const emptyMembershipForm = () => ({
  membershipId: "",
  politicianId: "",
  partyId: "",
  roleTitle: "",
  startDate: "",
  endDate: "",
  sourceNote: ""
});

const emptyCanonicalPromiseForm = () => ({
  politicianId: "",
  promiseText: "",
  publicStatus: "public" as "draft" | "public",
  primaryStatementId: "",
  acceptedSourceUrl: "",
  acceptedSourceNote: ""
});

export const OpsAdminPage = (): ReactElement => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [parties, setParties] = useState<Awaited<ReturnType<typeof listParties>>>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [allMembers, setAllMembers] = useState<BackendPartyMember[]>([]);
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [canonicalPromises, setCanonicalPromises] = useState<CanonicalPromiseSummary[]>([]);

  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const [aliasForm, setAliasForm] = useState(emptyAliasForm);
  const [membershipForm, setMembershipForm] = useState(emptyMembershipForm);
  const [canonicalPromiseForm, setCanonicalPromiseForm] = useState(emptyCanonicalPromiseForm);

  const loadData = async (): Promise<void> => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [partyList, politicianList, statementList, canonicalList] = await Promise.all([
        listParties(),
        listPoliticians(),
        listStatements(),
        listCanonicalPromises(undefined, session.token)
      ]);
      const memberLists = await Promise.all(partyList.map((party) => getPartyMembers(party.id, true)));

      setParties(partyList);
      setPoliticians(politicianList);
      setStatements(statementList);
      setCanonicalPromises(canonicalList);
      setAllMembers(memberLists.flatMap((response) => response.items));
    } catch (err) {
      setError((err as Error).message || "Unable to load protected admin records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [session]);

  const sortedPoliticians = useMemo(
    () => [...politicians].sort((left, right) => left.name.localeCompare(right.name)),
    [politicians]
  );
  const sortedMembers = useMemo(
    () =>
      [...allMembers].sort((left, right) =>
        `${left.name}|${left.partyId}|${left.startDate ?? ""}`.localeCompare(`${right.name}|${right.partyId}|${right.startDate ?? ""}`)
      ),
    [allMembers]
  );
  const filteredStatements = useMemo(() => {
    const politicianId = asPositiveInt(canonicalPromiseForm.politicianId);
    if (!politicianId) {
      return [] as StatementSummary[];
    }
    return statements
      .filter((statement) => statement.politicianId === politicianId)
      .sort((left, right) => new Date(right.dateSaid).getTime() - new Date(left.dateSaid).getTime());
  }, [canonicalPromiseForm.politicianId, statements]);

  const runAction = async (operation: () => Promise<void>, successMessage: string): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
      setMessage(successMessage);
      await loadData();
    } catch (err) {
      setError((err as Error).message || "Unable to save protected admin record.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return <LoadingState label="Restoring moderator session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading party and promise admin..." />;
  }

  if (error && parties.length === 0 && politicians.length === 0) {
    return <ErrorState message={error} onRetry={() => void loadData()} />;
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Party and promise admin</p>
        <h1>Protected party graph and canonical promise maintenance</h1>
        <div className="card-link-row">
          <Link to="/ops">Open politician proposal queue</Link>
          <Link to="/ops/records">Open editorial record ops</Link>
          <Link to="/ops/claims">Open promise claim queue</Link>
        </div>
      </section>

      {message ? <p className="meta-line">{message}</p> : null}
      {error ? (
        <p className="meta-line" role="alert">
          {error}
        </p>
      ) : null}

      <section className="cards-grid cards-grid-3" aria-label="Admin summary">
        <article className="card stack-xs">
          <h2>Canonical parties</h2>
          <p className="score-value">{parties.length}</p>
        </article>
        <article className="card stack-xs">
          <h2>Party memberships</h2>
          <p className="score-value">{allMembers.length}</p>
        </article>
        <article className="card stack-xs">
          <h2>Canonical promises</h2>
          <p className="score-value">{canonicalPromises.length}</p>
        </article>
      </section>

      <section className="split-grid">
        <article className="card stack-sm">
          <h2>Create party identity</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                await createParty(session.token, {
                  id: partyForm.id,
                  name: partyForm.name,
                  shortName: partyForm.shortName,
                  countryCode: partyForm.countryCode || "FI",
                  description: partyForm.description || undefined,
                  websiteUrl: partyForm.websiteUrl || undefined
                });
                setPartyForm(emptyPartyForm());
              }, "Party identity created.");
            }}
          >
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-admin-party-id">
                <span>Party id</span>
                <input
                  id="ops-admin-party-id"
                  className="text-input"
                  type="text"
                  value={partyForm.id}
                  onChange={(event) => setPartyForm((current) => ({ ...current, id: event.target.value }))}
                  placeholder="for example green-league"
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-party-name">
                <span>Name</span>
                <input
                  id="ops-admin-party-name"
                  className="text-input"
                  type="text"
                  value={partyForm.name}
                  onChange={(event) => setPartyForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-party-short">
                <span>Short name</span>
                <input
                  id="ops-admin-party-short"
                  className="text-input"
                  type="text"
                  value={partyForm.shortName}
                  onChange={(event) => setPartyForm((current) => ({ ...current, shortName: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-party-country">
                <span>Country code</span>
                <input
                  id="ops-admin-party-country"
                  className="text-input"
                  type="text"
                  value={partyForm.countryCode}
                  onChange={(event) => setPartyForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))}
                  required
                />
              </label>
            </div>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-admin-party-website">
                <span>Website URL</span>
                <input
                  id="ops-admin-party-website"
                  className="text-input"
                  type="url"
                  value={partyForm.websiteUrl}
                  onChange={(event) => setPartyForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-party-description">
                <span>Description</span>
                <input
                  id="ops-admin-party-description"
                  className="text-input"
                  type="text"
                  value={partyForm.description}
                  onChange={(event) => setPartyForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create party"}
            </button>
          </form>
        </article>

        <article className="card stack-sm">
          <h2>Add party alias</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                await createPartyAlias(session.token, aliasForm.partyId, {
                  alias: aliasForm.alias,
                  sourceNote: aliasForm.sourceNote || undefined
                });
                setAliasForm(emptyAliasForm());
              }, "Party alias added.");
            }}
          >
            <label className="field-group" htmlFor="ops-admin-alias-party">
              <span>Party</span>
              <select
                id="ops-admin-alias-party"
                className="select-input"
                value={aliasForm.partyId}
                onChange={(event) => setAliasForm((current) => ({ ...current, partyId: event.target.value }))}
                required
              >
                <option value="">Choose party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.shortName} - {party.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-admin-alias">
                <span>Alias</span>
                <input
                  id="ops-admin-alias"
                  className="text-input"
                  type="text"
                  value={aliasForm.alias}
                  onChange={(event) => setAliasForm((current) => ({ ...current, alias: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-alias-note">
                <span>Source note</span>
                <input
                  id="ops-admin-alias-note"
                  className="text-input"
                  type="text"
                  value={aliasForm.sourceNote}
                  onChange={(event) => setAliasForm((current) => ({ ...current, sourceNote: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Add alias"}
            </button>
          </form>
        </article>
      </section>

      <section className="split-grid">
        <article className="card stack-sm">
          <h2>Create or update party membership</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const politicianId = asPositiveInt(membershipForm.politicianId);
              const membershipId = asPositiveInt(membershipForm.membershipId);
              if (!politicianId || !membershipForm.partyId) {
                setError("Membership maintenance requires a politician and party.");
                return;
              }
              void runAction(async () => {
                if (membershipId) {
                  await updatePartyMembership(session.token, membershipId, {
                    partyId: membershipForm.partyId,
                    roleTitle: membershipForm.roleTitle || undefined,
                    startDate: membershipForm.startDate || null,
                    endDate: membershipForm.endDate || null,
                    sourceNote: membershipForm.sourceNote || undefined
                  });
                } else {
                  await createPartyMembership(session.token, {
                    politicianId,
                    partyId: membershipForm.partyId,
                    roleTitle: membershipForm.roleTitle || undefined,
                    startDate: membershipForm.startDate || undefined,
                    endDate: membershipForm.endDate || undefined,
                    sourceNote: membershipForm.sourceNote || undefined
                  });
                }
                setMembershipForm(emptyMembershipForm());
              }, membershipId ? "Party membership updated." : "Party membership created.");
            }}
          >
            <label className="field-group" htmlFor="ops-admin-membership-existing">
              <span>Existing membership (optional)</span>
              <select
                id="ops-admin-membership-existing"
                className="select-input"
                value={membershipForm.membershipId}
                onChange={(event) => {
                  const membershipId = event.target.value;
                  if (!membershipId) {
                    setMembershipForm(emptyMembershipForm());
                    return;
                  }
                  const selected = sortedMembers.find((member) => member.membershipId === Number(membershipId));
                  if (!selected) {
                    return;
                  }
                  setMembershipForm({
                    membershipId: String(selected.membershipId),
                    politicianId: String(selected.politicianId),
                    partyId: selected.partyId,
                    roleTitle: selected.roleTitle ?? "",
                    startDate: selected.startDate ?? "",
                    endDate: selected.endDate ?? "",
                    sourceNote: selected.sourceNote ?? ""
                  });
                }}
              >
                <option value="">Create new membership</option>
                {sortedMembers.map((member) => (
                  <option key={member.membershipId} value={String(member.membershipId)}>
                    {member.name} - {member.partyId} - {member.startDate ?? "unknown"} to {member.endDate ?? "current"}
                  </option>
                ))}
              </select>
            </label>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-admin-membership-politician">
                <span>Politician</span>
                <select
                  id="ops-admin-membership-politician"
                  className="select-input"
                  value={membershipForm.politicianId}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, politicianId: event.target.value }))}
                  required
                >
                  <option value="">Choose politician</option>
                  {sortedPoliticians.map((politician) => (
                    <option key={politician.id} value={String(politician.id)}>
                      {politician.name} - {formatIdentityLine(politician.office, politician.region)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-admin-membership-party">
                <span>Party</span>
                <select
                  id="ops-admin-membership-party"
                  className="select-input"
                  value={membershipForm.partyId}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, partyId: event.target.value }))}
                  required
                >
                  <option value="">Choose party</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.shortName} - {party.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-admin-membership-role">
                <span>Role title</span>
                <input
                  id="ops-admin-membership-role"
                  className="text-input"
                  type="text"
                  value={membershipForm.roleTitle}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, roleTitle: event.target.value }))}
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-membership-start">
                <span>Start date</span>
                <input
                  id="ops-admin-membership-start"
                  className="text-input"
                  type="date"
                  value={membershipForm.startDate}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-membership-end">
                <span>End date</span>
                <input
                  id="ops-admin-membership-end"
                  className="text-input"
                  type="date"
                  value={membershipForm.endDate}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-membership-note">
                <span>Source note</span>
                <input
                  id="ops-admin-membership-note"
                  className="text-input"
                  type="text"
                  value={membershipForm.sourceNote}
                  onChange={(event) => setMembershipForm((current) => ({ ...current, sourceNote: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : membershipForm.membershipId ? "Update membership" : "Create membership"}
            </button>
          </form>
        </article>

        <article className="card stack-sm">
          <h2>Create canonical promise directly</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const politicianId = asPositiveInt(canonicalPromiseForm.politicianId);
              const primaryStatementId = asPositiveInt(canonicalPromiseForm.primaryStatementId);
              const acceptedSourceUrl = canonicalPromiseForm.acceptedSourceUrl.trim();
              if (!politicianId) {
                setError("Canonical promise creation requires a politician.");
                return;
              }
              if (!primaryStatementId && !acceptedSourceUrl) {
                setError("Canonical promise creation requires a primary statement or an accepted source URL.");
                return;
              }
              void runAction(async () => {
                await createCanonicalPromise(session.token, {
                  politicianId,
                  promiseText: canonicalPromiseForm.promiseText,
                  publicStatus: canonicalPromiseForm.publicStatus,
                  primaryStatementId: primaryStatementId ?? undefined,
                  acceptedSources: acceptedSourceUrl
                    ? [
                        {
                          sourceUrl: acceptedSourceUrl,
                          sourceNote: canonicalPromiseForm.acceptedSourceNote || undefined,
                          statementId: primaryStatementId ?? undefined
                        }
                      ]
                    : undefined
                });
                setCanonicalPromiseForm(emptyCanonicalPromiseForm());
              }, "Canonical promise created.");
            }}
          >
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-admin-canonical-politician">
                <span>Politician</span>
                <select
                  id="ops-admin-canonical-politician"
                  className="select-input"
                  value={canonicalPromiseForm.politicianId}
                  onChange={(event) =>
                    setCanonicalPromiseForm((current) => ({
                      ...current,
                      politicianId: event.target.value,
                      primaryStatementId: ""
                    }))
                  }
                  required
                >
                  <option value="">Choose politician</option>
                  {sortedPoliticians.map((politician) => (
                    <option key={politician.id} value={String(politician.id)}>
                      {politician.name} - {formatIdentityLine(politician.office, politician.region)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-admin-canonical-status">
                <span>Public status</span>
                <select
                  id="ops-admin-canonical-status"
                  className="select-input"
                  value={canonicalPromiseForm.publicStatus}
                  onChange={(event) =>
                    setCanonicalPromiseForm((current) => ({
                      ...current,
                      publicStatus: event.target.value as "draft" | "public"
                    }))
                  }
                >
                  <option value="public">public</option>
                  <option value="draft">draft</option>
                </select>
              </label>
              <label className="field-group" htmlFor="ops-admin-canonical-statement">
                <span>Primary statement (optional)</span>
                <select
                  id="ops-admin-canonical-statement"
                  className="select-input"
                  value={canonicalPromiseForm.primaryStatementId}
                  onChange={(event) =>
                    setCanonicalPromiseForm((current) => ({
                      ...current,
                      primaryStatementId: event.target.value
                    }))
                  }
                >
                  <option value="">No primary statement</option>
                  {filteredStatements.map((statement) => (
                    <option key={statement.id} value={String(statement.id)}>
                      #{statement.id} - {statement.dateSaid} - {statement.body.slice(0, 72)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field-group" htmlFor="ops-admin-canonical-text">
              <span>Promise text</span>
              <textarea
                id="ops-admin-canonical-text"
                className="text-input"
                rows={4}
                style={{ minHeight: "132px", padding: "12px" }}
                value={canonicalPromiseForm.promiseText}
                onChange={(event) => setCanonicalPromiseForm((current) => ({ ...current, promiseText: event.target.value }))}
                required
              />
            </label>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-admin-canonical-source-url">
                <span>Accepted source URL</span>
                <input
                  id="ops-admin-canonical-source-url"
                  className="text-input"
                  type="url"
                  value={canonicalPromiseForm.acceptedSourceUrl}
                  onChange={(event) =>
                    setCanonicalPromiseForm((current) => ({ ...current, acceptedSourceUrl: event.target.value }))
                  }
                  placeholder="Required when no primary statement is selected"
                />
              </label>
              <label className="field-group" htmlFor="ops-admin-canonical-source-note">
                <span>Accepted source note</span>
                <input
                  id="ops-admin-canonical-source-note"
                  className="text-input"
                  type="text"
                  value={canonicalPromiseForm.acceptedSourceNote}
                  onChange={(event) =>
                    setCanonicalPromiseForm((current) => ({ ...current, acceptedSourceNote: event.target.value }))
                  }
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create canonical promise"}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
};
