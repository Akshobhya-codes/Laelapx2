import { LogoSpinner } from "@/components/motion/logo-spinner";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <LogoSpinner size={72} label="Scoring your Snapshot…" />
    </div>
  );
}
