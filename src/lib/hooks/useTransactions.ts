"use client";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { getCurrentUser } from "@/lib/session";
import { Transaction, TransactionFilters } from "../types";
import { TransactionInput } from "../validations/transaction";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { toast } from "sonner";

const supabase = createClient();
const PAGE_SIZE = 25;

function buildDateRange(filters: TransactionFilters) {
  const now = new Date();

  const toUTCISOString = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();

  switch (filters.datePreset) {
    case "this_month":
      return {
        from: toUTCISOString(startOfMonth(now)),
        to: toUTCISOString(endOfMonth(now)),
      };

    case "today":
      return {
        from: toUTCISOString(startOfDay(now)),
        to: toUTCISOString(endOfDay(now)),
      };

    case "this_week":
      return {
        from: toUTCISOString(startOfWeek(now)),
        to: toUTCISOString(endOfWeek(now)),
      };

    case "last_7_days":
      return {
        from: toUTCISOString(subDays(now, 7)),
        to: toUTCISOString(now),
      };

    case "last_30_days":
      return {
        from: toUTCISOString(subDays(now, 30)),
        to: toUTCISOString(now),
      };

    case "this_year":
      return {
        from: toUTCISOString(startOfYear(now)),
        to: toUTCISOString(endOfYear(now)),
      };

    case "custom":
      return {
        from: filters.dateFrom,
        to: filters.dateTo,
      };

    default:
      return {
        from: toUTCISOString(startOfMonth(now)),
        to: toUTCISOString(endOfMonth(now)),
      };
  }
}
function buildDateRange1(filters: TransactionFilters) {
  const now = new Date();
  switch (filters.datePreset) {
    case "today":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case "this_week":
      return {
        from: startOfWeek(now).toISOString(),
        to: endOfWeek(now).toISOString(),
      };
    case "this_month":
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      };
    case "last_7_days":
      return { from: subDays(now, 7).toISOString(), to: now.toISOString() };
    case "last_30_days":
      return { from: subDays(now, 30).toISOString(), to: now.toISOString() };
    case "this_year":
      return {
        from: startOfYear(now).toISOString(),
        to: endOfYear(now).toISOString(),
      };
    case "custom":
      return { from: filters.dateFrom, to: filters.dateTo };
    default:
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      };
  }
}
async function fetchTransactions(filters: TransactionFilters, page = 0) {
  // Normalize filters: compute from/to from datePreset, accept singular category/account keys
  const dateRange = buildDateRange(filters);
  const payloadFilters: any = { ...filters };
  // ensure we send from/to as ISO strings for server
  if (dateRange?.from) payloadFilters.from = dateRange.from;
  if (dateRange?.to) payloadFilters.to = dateRange.to;
  // normalize singular keys
  if ((filters as any).categoryId && !filters.categoryIds)
    payloadFilters.categoryIds = [(filters as any).categoryId];
  if ((filters as any).accountId && !filters.accountIds)
    payloadFilters.accountIds = [(filters as any).accountId];

  // Use server-side query to avoid RLS issues when using custom JWTs
  const res = await fetch("/api/transactions/query", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filters: payloadFilters, page }),
  });
  const payload = await res.json();
  if (!res.ok)
    throw new Error(payload?.error || "Failed to fetch transactions");
  return {
    data: payload.data as Transaction[],
    count: payload.count as number,
  };
}


export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: ["transactions", filters],
    queryFn: ({ pageParam = 0 }) => fetchTransactions(filters, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap((p) => p.data).length;
      return loaded < lastPage.count ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
}

export function useTransactionStats(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transaction-stats", filters],
    queryFn: async () => {
      const dateRange = buildDateRange(filters);
      const payloadFilters: any = { ...filters };
      if (dateRange?.from) payloadFilters.from = dateRange.from;
      if (dateRange?.to) payloadFilters.to = dateRange.to;
      if ((filters as any).categoryId && !filters.categoryIds)
        payloadFilters.categoryIds = [(filters as any).categoryId];
      if ((filters as any).accountId && !filters.accountIds)
        payloadFilters.accountIds = [(filters as any).accountId];

      const res = await fetch("/api/transactions/stats", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filters: payloadFilters }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to compute stats");
      return payload;
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to create transaction");
      return payload.transaction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transaction-stats"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transaction added successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<TransactionInput> & { id: string }) => {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...input }),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to update transaction");
      return payload.transaction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transaction-stats"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to delete transaction");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["transaction-stats"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transaction deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
