"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "@/components/ui/button";
import { getPluggyConnectToken, syncPluggyItem } from "./pluggy-actions";

export function ConnectBankButton() {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const token = await getPluggyConnectToken();
        setConnectToken(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start bank connection.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <Button variant="outline" onClick={handleClick} disabled={isPending}>
          Connect bank (Pluggy)
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={({ item }) => {
            startTransition(async () => {
              await syncPluggyItem(item.id);
              setConnectToken(null);
              router.refresh();
            });
          }}
          onError={(error) => {
            console.error("Pluggy Connect error:", error);
            setConnectToken(null);
          }}
        />
      )}
    </>
  );
}
