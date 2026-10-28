"use client";

import { createContext, useContext } from "react";

const TeamIdContext = createContext<number | null>(null);

/** Bọc các trang của 1 đội; form bên trong tự gửi kèm teamId cho server action. */
export function TeamProvider({ teamId, children }: { teamId: number; children: React.ReactNode }) {
  return <TeamIdContext.Provider value={teamId}>{children}</TeamIdContext.Provider>;
}

export function useTeamId() {
  return useContext(TeamIdContext);
}
