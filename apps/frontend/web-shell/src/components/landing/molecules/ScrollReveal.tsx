'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ScrollRevealProps } from '../../../interfaces/interface';

/** Wrapper de entrada suave por scroll (fade + slide-up), reutilizado por Hero y las secciones. */
export function ScrollReveal({ children, delay = 0 }: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}
