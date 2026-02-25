/* WHAT IT DO? Loads shared public politicians/statements data once and provides it to all V3 public routes. */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { listPoliticians, listStatements } from "../lib/api";
import type { Politician, StatementSummary } from "../types";

interface PublicDataState {
  politicians: Politician[];
  statements: StatementSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PublicDataContext = createContext<PublicDataState | undefined>(undefined);

const EMPTY_STATE: Pick<PublicDataState, "politicians" | "statements"> = {
  politicians: [],
  statements: []
};

export const PublicDataProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [politicians, setPoliticians] = useState<Politician[]>(EMPTY_STATE.politicians);
  const [statements, setStatements] = useState<StatementSummary[]>(EMPTY_STATE.statements);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [politicianItems, statementItems] = await Promise.all([listPoliticians(), listStatements()]);
      setPoliticians(politicianItems);
      setStatements(statementItems);
    } catch (err) {
      setError((err as Error).message || "Unable to load public data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<PublicDataState>(
    () => ({
      politicians,
      statements,
      loading,
      error,
      refresh
    }),
    [error, loading, politicians, statements]
  );

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
};

export const usePublicData = (): PublicDataState => {
  const context = useContext(PublicDataContext);
  if (!context) {
    throw new Error("usePublicData must be used within PublicDataProvider");
  }

  return context;
};
