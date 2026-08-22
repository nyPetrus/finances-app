"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/lib/supabase/types";

const ALL_ACCOUNTS = "all";

export function AccountFilter({
  accounts,
  month,
  selectedAccountId,
}: {
  accounts: Account[];
  month: string;
  selectedAccountId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Select
      value={selectedAccountId ?? ALL_ACCOUNTS}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams);
        params.set("month", month);
        if (value && value !== ALL_ACCOUNTS) params.set("account", value);
        else params.delete("account");
        router.push(`/transactions?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-44" size="sm">
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ACCOUNTS}>All accounts</SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
