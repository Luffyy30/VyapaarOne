"use client";
import { createContext, useContext } from "react";
import type { Business } from "@/lib/types";

export type Ctx = { userId: string; business: Business };
export const SessionCtx = createContext<Ctx | null>(null);
export const useSession = () => useContext(SessionCtx) as Ctx;
