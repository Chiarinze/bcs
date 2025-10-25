"use client";

import { ReactNode } from "react";
import useReveal from "@/hooks/useReveal";

export function RevealWrapper({ children }: { children: ReactNode }) {
  useReveal();
  return <>{children}</>;
}
