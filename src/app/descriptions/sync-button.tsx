"use client";

import { useState, useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncMappedDescriptions } from "./actions";

export function SyncButton() {
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
            const count = await syncMappedDescriptions();
            setMessage(count === 1 ? "1 transaction categorized." : `${count} transactions categorized.`);
          });
        }}
        aria-label="Sync"
        title="Sync"
      >
        <RefreshCwIcon className={pending ? "animate-spin" : undefined} />
      </Button>
    </div>
  );
}
