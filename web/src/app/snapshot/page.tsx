import type { Metadata } from "next";
import { SnapshotDemo } from "./snapshot-demo";

export const metadata: Metadata = {
  title: "See how Laelapx works · Snapshot demo",
  description:
    "A 30-second walk-through of how Laelapx turns a pitch deck into a Fundability Snapshot — score, gaps, and matched investors — in seconds.",
  openGraph: {
    title: "See how Laelapx works · Snapshot demo",
    description:
      "A 30-second walk-through of how Laelapx turns a pitch deck into a Fundability Snapshot — score, gaps, and matched investors — in seconds.",
  },
};

export default function SnapshotPage() {
  return <SnapshotDemo />;
}
