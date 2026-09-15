"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { PencilIcon, PlugZapIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addAccount } from "./actions";
import { getPluggyConnectToken, syncPluggyItem } from "./pluggy-actions";

// react-pluggy-connect touches `window` at module load time, which crashes
// server-side rendering. Load it client-only.
const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((mod) => mod.PluggyConnect),
  { ssr: false },
);

// "+" opens a menu choosing between a manual entry (the plain add-account
// form) and connecting a real bank via Pluggy — replaces what used to be
// two separate toolbar entry points (AddAccountDialog and
// ConnectBankButton).
export function AddAccountMenu({
  onError,
  onConnected,
}: {
  onError?: (message: string | null) => void;
  onConnected?: () => void;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isConnecting, startConnecting] = useTransition();

  function handleConnectBank() {
    onError?.(null);
    startConnecting(async () => {
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Add account" title="Add account" />}
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setManualOpen(true)}>
            <PencilIcon />
            Manually
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleConnectBank} disabled={isConnecting}>
            <PlugZapIcon />
            Connect to bank
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New account</DialogTitle>
          </DialogHeader>
          <form
            id="add-account-form"
            action={async (formData) => {
              await addAccount(formData);
              setManualOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="label">Account (optional)</Label>
              <Input id="label" name="label" placeholder="Short label for this account" autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Nubank Checking" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="manual">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="fgts">FGTS</SelectItem>
                  <SelectItem value="credit_card">Credit card</SelectItem>
                  <SelectItem value="manual">Manual / Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="current_balance">Current balance</Label>
              <Input
                id="current_balance"
                name="current_balance"
                type="number"
                step="0.01"
                defaultValue="0"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" form="add-account-form">
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={({ item }) => {
            startConnecting(async () => {
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
