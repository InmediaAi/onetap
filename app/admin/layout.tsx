"use client";

import { ToastProvider } from "@/components/admin/Toast";

/** Wraps the whole /admin route so any admin component can useToast(). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
