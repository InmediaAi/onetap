"use client";

import { motion } from "framer-motion";

export default function Hero({ onTry }: { onTry: () => void }) {
  return (
    <section className="mx-auto max-w-editorial px-6 pb-16 pt-20 text-center md:px-10 md:pb-24 md:pt-28">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="eyebrow"
      >
        The right answer. Chosen for you.
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-7xl"
      >
        Chosen, not searched.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.12 }}
        className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg"
      >
        The most considered pieces in luxury fashion, visualized on you in
        seconds.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mt-10"
      >
        <button onClick={onTry} className="btn-line">
          Try Your First Look
        </button>
      </motion.div>
    </section>
  );
}
