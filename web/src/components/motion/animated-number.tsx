"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  durationMs = 1600,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, {
    duration: durationMs,
    bounce: 0,
  });
  const text = useTransform(spring, (v) => format(v));

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  return <motion.span ref={ref}>{text}</motion.span>;
}

export const formatUsdShort = (n: number): string => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

export const formatUsd = (n: number): string =>
  `$${Math.round(n).toLocaleString()}`;
