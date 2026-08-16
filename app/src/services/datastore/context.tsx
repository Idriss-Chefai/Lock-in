import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { DataStore } from "./DataStore";
import { JsonDataStore } from "./JsonDataStore";

const DataStoreContext = createContext<DataStore | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  // Swapping to SqliteDataStore later means changing only this line.
  const store = useMemo<DataStore>(() => new JsonDataStore(), []);
  return <DataStoreContext.Provider value={store}>{children}</DataStoreContext.Provider>;
}

export function useDataStore(): DataStore {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
