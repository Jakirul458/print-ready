import { Loader2, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProcessingStatusProps {
  steps: { label: string; done: boolean; active: boolean }[];
  progress: number;
}

export default function ProcessingStatus({ steps, progress }: ProcessingStatusProps) {
  return (
    <div className="space-y-4 p-5 sm:p-6 bg-card/90 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-medium text-foreground text-sm sm:text-base">Processing your photos…</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="space-y-2 mt-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : step.active ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-border/50" />
            )}
            <span className={step.done ? "text-muted-foreground" : step.active ? "text-foreground font-medium" : "text-muted-foreground"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
