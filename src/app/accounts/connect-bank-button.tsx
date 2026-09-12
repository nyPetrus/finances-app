"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { PlugZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPluggyConnectToken, syncPluggyItem } from "./pluggy-actions";

// react-pluggy-connect touches `window` at module load time, which crashes
// server-side rendering. Load it client-only.
const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((mod) => mod.PluggyConnect),
  { ssr: false },
);

export function ConnectBankButton({
  onError,
  onConnected,
}: {
  onError?: (message: string | null) => void;
  onConnected?: () => void;
}) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    onError?.(null);
    startTransition(async () => {
      try {
        const token = await getPluggyConnectToken();
        setConnectToken(token);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Failed to start bank connection.");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={handleClick}
        disabled={isPending}
        aria-label="Connect bank"
        title="Connect bank"
      >
        <PlugZapIcon />
      </Button>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={({ item }) => {
            startTransition(async () => {
              try {
                await syncPluggyItem(item.id);
                setConnectToken(null);
                onConnected?.();
              } catch (err) {
                onError?.(err instanceof Error ? err.message : "Failed to sync the connected bank.");
                setConnectToken(null);
              }
            });
          }}
          onError={(err) => {
            console.error("Pluggy Connect error:", err);
            onError?.(err.message ?? "Failed to connect bank.");
            setConnectToken(null);
          }}
        />
      )}
    </>
  );
}
