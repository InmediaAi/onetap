"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import UploadZone from "@/components/UploadZone";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

interface FormValues {
  portrait: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const portrait = useAtelier((s) => s.portrait);
  const setPortrait = useAtelier((s) => s.setPortrait);

  const { control, handleSubmit, watch, reset } = useForm<FormValues>({
    defaultValues: { portrait: null },
  });

  // Seed form with any previously saved portrait once hydrated.
  useEffect(() => {
    if (hydrated && portrait) reset({ portrait });
  }, [hydrated, portrait, reset]);

  const current = watch("portrait");

  const onSubmit = (values: FormValues) => {
    if (!values.portrait) return;
    setPortrait(values.portrait);
    router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid w-full grid-cols-1 items-center gap-12 md:grid-cols-2"
      >
        <div>
          <p className="eyebrow">One-time setup</p>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            Add your portrait
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted">
            This is the photo OneTap uses to visualize every look on you. A
            clear, front-facing portrait works best — you only do this once.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-luxe text-muted">
            Supported · jpg · jpeg · png
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-xs uppercase tracking-luxe text-muted transition-colors hover:text-ink"
          >
            Skip for now →
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Controller
            control={control}
            name="portrait"
            render={({ field }) => (
              <UploadZone value={field.value} onChange={field.onChange} />
            )}
          />
          <button type="submit" disabled={!current} className="btn-line w-full disabled:opacity-40">
            Continue to the Atelier
          </button>
        </form>
      </motion.div>
    </main>
  );
}
