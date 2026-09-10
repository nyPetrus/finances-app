"use client";

import { useState, useTransition } from "react";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoCategorizeFromHistory } from "./actions";

export function AutoCategorizeButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
      <Button
        variant="outline"
        size="icon"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const { newMappings, categorizedCount } = await autoCategorizeFromHistory();
            setMessage(
              newMappings === 0 && categorizedCount === 0
                ? "No new patterns found."
                : `${newMappings === 1 ? "1 pattern" : `${newMappings} patterns`} learned — ${
                    categorizedCount === 1 ? "1 transaction" : `${categorizedCount} transactions`
                  } categorized.`,
            );
          });
        }}
        aria-label="Auto-categorize from history"
        title="Auto-categorize from history"
      >
        <SparklesIcon className={pending ? "animate-pulse" : undefined} />
      </Button>
    </div>
  );
}
