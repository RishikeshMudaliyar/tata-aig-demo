"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { SWRConfig } from "swr";

export type Persona = {
  id: string;
  name: string;
  role: string;
  title: string;
  initials: string;
  region?: string | null;
  branch?: string | null;
};

type Ctx = {
  persona: Persona | null;
  setPersona: (p: Persona | null) => void;
  ready: boolean;
};

const PersonaCtx = createContext<Ctx>({ persona: null, setPersona: () => {}, ready: false });

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersonaState] = useState<Persona | null>(null);
  const [ready, setReady] = useState(false);

  // sessionStorage = per-tab sign-in, so two tabs can hold two different roles
  // side by side (the two-screen demo). Falls back to the old localStorage key once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bl_persona") ?? localStorage.getItem("bl_persona");
      if (raw) setPersonaState(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const setPersona = (p: Persona | null) => {
    setPersonaState(p);
    try {
      if (p) sessionStorage.setItem("bl_persona", JSON.stringify(p));
      else sessionStorage.removeItem("bl_persona");
      localStorage.removeItem("bl_persona");
    } catch {}
  };

  return (
    <PersonaCtx.Provider value={{ persona, setPersona, ready }}>
      {/* keep polling in background tabs — hand-offs must land in the other window live */}
      <SWRConfig value={{ refreshWhenHidden: true }}>{children}</SWRConfig>
    </PersonaCtx.Provider>
  );
}

export const usePersona = () => useContext(PersonaCtx);
