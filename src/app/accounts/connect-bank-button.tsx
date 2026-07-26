"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PluggyConnect } from "react-pluggy-connect";
import { Button } from "@/components/ui/button";
import { getPluggyConnectToken, syncPluggyItem } from "./pluggy-actions";

export function ConnectBankButton() {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    const token = await getPluggyConnectToken();
    setConnectToken(token);
  }

  return (
    <>
      <Button variant="outline" onClick={handleClick} disabled={isPending}>
        Connect bank (Pluggy)
      </Button>

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
