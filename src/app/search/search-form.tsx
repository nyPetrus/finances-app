"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, Category, Class } from "@/lib/supabase/types";
import {
  UNCATEGORIZED_VALUE,
  UNCLASSED_VALUE,
  type AmountOp,
  type DateGranularity,
  type DateOp,
  type DescriptionOp,
  type EqualityOp,
  type ParsedFilters,
} from "./filters";

const EQUALITY_LABELS: Record<EqualityOp, string> = {
  is: "Is",
  is_not: "Is not",
};

const DESCRIPTION_OP_LABELS: Record<DescriptionOp, string> = {
  equal_to: "Equal to",
  starts_with: "Starts with",
  contains: "Contains",
};

const DATE_GRANULARITY_LABELS: Record<DateGranularity, string> = {
  year: "Year",
  month: "Month",
  day: "Day",
};

const DATE_OP_LABELS: Record<DateOp, string> = {
  on: "On",
  before: "Before",
  after: "After",
};

const AMOUNT_OP_LABELS: Record<AmountOp, string> = {
  equal_to: "Equal to",
  greater_than: "Greater than",
  less_than: "Less than",
};

export function SearchForm({
  accounts,
  categories,
  classes,
  filters,
}: {
  accounts: Account[];
  categories: Category[];
  classes: Class[];
  filters: ParsedFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountValue, setAccountValue] = useState<string | null>(filters.account?.value ?? null);
  const [accountOp, setAccountOp] = useState<EqualityOp>(filters.account?.op ?? "is");

  const [categoryValue, setCategoryValue] = useState<string | null>(filters.category?.value ?? null);
  const [categoryOp, setCategoryOp] = useState<EqualityOp>(filters.category?.op ?? "is");

  const [classValue, setClassValue] = useState<string | null>(filters.class?.value ?? null);
  const [classOp, setClassOp] = useState<EqualityOp>(filters.class?.op ?? "is");

  const [descriptionValue, setDescriptionValue] = useState(filters.description?.value ?? "");
  const [descriptionOp, setDescriptionOp] = useState<DescriptionOp>(filters.description?.op ?? "contains");

  const [dateGranularity, setDateGranularity] = useState<DateGranularity>(filters.date?.granularity ?? "day");
  const [dateOp, setDateOp] = useState<DateOp>(filters.date?.op ?? "on");
  const [dateValue, setDateValue] = useState(filters.date?.value ?? "");

  const [amountOp, setAmountOp] = useState<AmountOp>(filters.amount?.op ?? "equal_to");
  const [amountValue, setAmountValue] = useState(filters.amount?.value ?? "");

  function handleApply() {
    const params = new URLSearchParams();

    if (accountValue) {
      params.set("account", accountValue);
      params.set("accountOp", accountOp);
    }
    if (categoryValue) {
      params.set("category", categoryValue);
      params.set("categoryOp", categoryOp);
    }
    if (classValue) {
      params.set("class", classValue);
      params.set("classOp", classOp);
    }
    if (descriptionValue.trim()) {
      params.set("description", descriptionValue.trim());
      params.set("descriptionOp", descriptionOp);
    }
    if (dateValue) {
      params.set("dateGranularity", dateGranularity);
      params.set("dateOp", dateOp);
      params.set("dateValue", dateValue);
    }
    if (amountValue.trim() !== "") {
      params.set("amount", amountValue.trim());
      params.set("amountOp", amountOp);
    }

    const sort = searchParams.get("sort");
    const dir = searchParams.get("dir");
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);

    router.push(`/search?${params.toString()}`);
  }

  function handleClear() {
    setAccountValue(null);
    setAccountOp("is");
    setCategoryValue(null);
    setCategoryOp("is");
    setClassValue(null);
    setClassOp("is");
    setDescriptionValue("");
    setDescriptionOp("contains");
    setDateGranularity("day");
    setDateOp("on");
    setDateValue("");
    setAmountOp("equal_to");
    setAmountValue("");
    router.push("/search");
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="w-24 shrink-0">Account</Label>
        <Select value={accountOp} onValueChange={(value) => setAccountOp(value as EqualityOp)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="is">{EQUALITY_LABELS.is}</SelectItem>
            <SelectItem value="is_not">{EQUALITY_LABELS.is_not}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={accountValue} onValueChange={setAccountValue}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Any account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.label ?? account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="w-24 shrink-0">Category</Label>
        <Select value={categoryOp} onValueChange={(value) => setCategoryOp(value as EqualityOp)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="is">{EQUALITY_LABELS.is}</SelectItem>
            <SelectItem value="is_not">{EQUALITY_LABELS.is_not}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryValue} onValueChange={setCategoryValue}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Any category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNCATEGORIZED_VALUE}>Uncategorized</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="w-24 shrink-0">Class</Label>
        <Select value={classOp} onValueChange={(value) => setClassOp(value as EqualityOp)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="is">{EQUALITY_LABELS.is}</SelectItem>
            <SelectItem value="is_not">{EQUALITY_LABELS.is_not}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classValue} onValueChange={setClassValue}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Any class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNCLASSED_VALUE}>Unclassed</SelectItem>
            {classes.map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id}>
                {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="search-description" className="w-24 shrink-0">
          Description
        </Label>
        <Select value={descriptionOp} onValueChange={(value) => setDescriptionOp(value as DescriptionOp)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equal_to">{DESCRIPTION_OP_LABELS.equal_to}</SelectItem>
            <SelectItem value="starts_with">{DESCRIPTION_OP_LABELS.starts_with}</SelectItem>
            <SelectItem value="contains">{DESCRIPTION_OP_LABELS.contains}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          id="search-description"
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
          placeholder="e.g. uber"
          className="w-56"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label className="w-24 shrink-0">Date</Label>
        <Select
          value={dateGranularity}
          onValueChange={(value) => {
            setDateGranularity(value as DateGranularity);
            setDateValue("");
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">{DATE_GRANULARITY_LABELS.year}</SelectItem>
            <SelectItem value="month">{DATE_GRANULARITY_LABELS.month}</SelectItem>
            <SelectItem value="day">{DATE_GRANULARITY_LABELS.day}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateOp} onValueChange={(value) => setDateOp(value as DateOp)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="on">{DATE_OP_LABELS.on}</SelectItem>
            <SelectItem value="before">{DATE_OP_LABELS.before}</SelectItem>
            <SelectItem value="after">{DATE_OP_LABELS.after}</SelectItem>
          </SelectContent>
        </Select>
        {dateGranularity === "year" ? (
          <Input
            type="number"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            placeholder="2026"
            className="w-28"
          />
        ) : dateGranularity === "month" ? (
          <Input
            type="month"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-40"
          />
        ) : (
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-40"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="search-amount" className="w-24 shrink-0">
          Amount
        </Label>
        <Select value={amountOp} onValueChange={(value) => setAmountOp(value as AmountOp)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equal_to">{AMOUNT_OP_LABELS.equal_to}</SelectItem>
            <SelectItem value="greater_than">{AMOUNT_OP_LABELS.greater_than}</SelectItem>
            <SelectItem value="less_than">{AMOUNT_OP_LABELS.less_than}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          id="search-amount"
          type="number"
          step="0.01"
          value={amountValue}
          onChange={(e) => setAmountValue(e.target.value)}
          placeholder="-50.00"
          className="w-56"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleApply}>Apply</Button>
        <Button variant="outline" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
