"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CardListHeader } from "@/components/card-list-header";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { CategoryIcon } from "@/components/category-icon";
import type { Account, Category, Class, Transaction } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Phone layout for the transaction tables (Search and the Dashboard's
 * embedded table): one two-line card per transaction — left, description
 * over date · account (name + type icon); right, amount over category
 * icon · class icon. Tapping a card
 * opens it (the caller's edit dialog); the checkbox selects it for the
 * toolbar's "⋮". Sorting goes through CardListHeader.
 */
export function TransactionCardList<K extends string>({
  transactions,
  accountsById,
  categoriesById,
  classesById,
  formatDate,
  renderAmount,
  selected,
  allSelected,
  someSelected,
  onToggleAll,
  onToggleOne,
  onOpen,
  sortOptions,
  sortKey,
  sortDir,
  onSortChange,
  className,
}: {
  transactions: Transaction[];
  accountsById: Map<string, Account>;
  categoriesById: Map<string, Category>;
  classesById: Map<string, Class>;
  formatDate: (iso: string) => string;
  renderAmount: (transaction: Transaction) => ReactNode;
  selected: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onOpen: (transaction: Transaction) => void;
  sortOptions: { key: K; label: string }[];
  sortKey: K;
  sortDir: "asc" | "desc";
  onSortChange: (key: K, dir: "asc" | "desc") => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <CardListHeader
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleAll={onToggleAll}
        selectAllLabel="Select all transactions"
        sortOptions={sortOptions}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={onSortChange}
      />
      <ul className="flex flex-col divide-y rounded-lg border">
        {transactions.map((transaction) => {
          const account = accountsById.get(transaction.account_id);
          const category = transaction.category_id ? categoriesById.get(transaction.category_id) : undefined;
          const transactionClass = transaction.class_id ? classesById.get(transaction.class_id) : undefined;
          return (
            <li
              key={transaction.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                transaction.is_hidden && "text-muted-foreground",
                selected.has(transaction.id) && "bg-muted",
              )}
            >
              <Checkbox
                checked={selected.has(transaction.id)}
                onCheckedChange={() => onToggleOne(transaction.id)}
                aria-label={`Select ${transaction.description}`}
              />
              <button
                type="button"
                onClick={() => onOpen(transaction)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                {/* Left: what, when and from where (a long account name
                    truncates). Right: how much, over category and class
                    icons — per explicit user request. */}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-medium">{transaction.description}</span>
                  <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0">{formatDate(transaction.date)}</span>
                    {account && (
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="min-w-0 truncate">{account.name}</span>
                        <AccountTypeIcon type={account.type} className="size-3 shrink-0" />
                      </span>
                    )}
                    {transaction.is_hidden && (
                      <Badge variant="outline" className="shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium whitespace-nowrap">{renderAmount(transaction)}</span>
                  {(category || transactionClass) && (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {category && (
                        <span title={category.name} className="inline-flex">
                          <CategoryIcon icon={category.icon} className="size-4" />
                        </span>
                      )}
                      {transactionClass && (
                        <span title={transactionClass.name} className="inline-flex">
                          <CategoryIcon icon={transactionClass.icon} className="size-4" />
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
