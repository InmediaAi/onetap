"use client";

import { ToastProvider } from "@/components/Toast";

/** Wraps /fifa so the microsite can fire green/red toasts (e.g. on sign-in). */
export default function FifaLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
