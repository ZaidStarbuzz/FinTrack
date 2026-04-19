"use client";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createClient } from "../supabase/client";
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
  const PAGE_SIZE = 25;

  // 🔧 helper to avoid timezone shifting issues
  const toUTCISOString = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();

  function buildSafeDateRange() {
    const now = new Date();

    switch (filters.datePreset) {
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

      case "this_month":
        return {
          from: toUTCISOString(startOfMonth(now)),
          to: toUTCISOString(endOfMonth(now)),
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

  const { from, to } = buildSafeDateRange();

  console.log("FILTERS:", filters);
  console.log("DATE RANGE:", { from, to });

  let query = supabase
    .from("transactions")
    .select(
      `
  *,
  account:accounts!transactions_account_id_fkey(*),
  transfer_account:accounts!transactions_transfer_account_id_fkey(*),
  category:categories(*)
`,
    )
    .order("date", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  // ✅ Date filter (fixed)
  if (from && to) {
    query = query.gte("date", from).lte("date", to);
  }

  // ✅ Type filter
  if (filters.types?.length) {
    query = query.in("type", filters.types);
  }

  // ✅ Category filter
  if (filters.categoryIds?.length) {
    query = query.in("category_id", filters.categoryIds);
  }

  // ✅ Account filter
  if (filters.accountIds?.length) {
    query = query.in("account_id", filters.accountIds);
  }

  // ✅ Amount filters (handle string/numeric safely)
  if (filters.amountMin != null) {
    query = query.gte("amount", filters.amountMin);
  }

  if (filters.amountMax != null) {
    query = query.lte("amount", filters.amountMax);
  }

  // ✅ Status filter
  if (filters.status?.length) {
    query = query.in("status", filters.status);
  }

  // ✅ FIXED search (no more textSearch bug)
  if (filters.search?.trim()) {
    query = query.ilike("description", `%${filters.search.trim()}%`);
  }

  // ✅ Tags filter (only if column is array)
  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags);
  }

  const { data, error, count } = await query;

  console.log("QUERY RESULT:", { data, error, count });

  if (error) {
    console.error("SUPABASE ERROR:", error);
    throw error;
  }

  return {
    data: (data ?? []) as Transaction[],
    count: count ?? 0,
  };
}

async function fetchTransactionsa(filters: TransactionFilters, page = 0) {
  console.log(filters, "lkjhgfdghjk");
  let query = supabase
    .from("transactions")
    .select(
      "*, account:accounts(*), category:categories(*), transfer_account:accounts!transfer_account_id(*)",
      { count: "exact" },
    )
    .order("date", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { from, to } = buildDateRange(filters);
  if (from && to) {
    query = query.gte("date", from).lte("date", to);
  }
  if (filters.types?.length) query = query.in("type", filters.types);
  if (filters.categoryIds?.length)
    query = query.in("category_id", filters.categoryIds);
  if (filters.accountIds?.length)
    query = query.in("account_id", filters.accountIds);
  if (filters.amountMin !== undefined)
    query = query.gte("amount", filters.amountMin);
  if (filters.amountMax !== undefined)
    query = query.lte("amount", filters.amountMax);
  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.search)
    query = query.textSearch("description", filters.search, {
      type: "websearch",
    });
  if (filters.tags?.length) query = query.overlaps("tags", filters.tags);
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as Transaction[], count: count || 0 };
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
      const { from, to } = buildDateRange(filters);
      let query = supabase
        .from("transactions")
        .select("type, amount, category_id, categories(name,icon,color)")
        .neq("status", "void");

      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);

      const { data, error } = await query;
      if (error) throw error;

      const income = (data || [])
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expenses = (data || [])
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      const net = income - expenses;
      const savingsRate = income > 0 ? (net / income) * 100 : 0;

      // Category breakdown
      const catMap = new Map<
        string,
        {
          name: string;
          icon: string;
          color: string;
          amount: number;
          count: number;
        }
      >();
      (data || [])
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const key = t.category_id || "uncategorized";
          const cat = (t as any).categories;
          const existing = catMap.get(key) || {
            name: cat?.name || "Uncategorized",
            icon: cat?.icon || "package",
            color: cat?.color || "#888",
            amount: 0,
            count: 0,
          };
          existing.amount += t.amount;
          existing.count += 1;
          catMap.set(key, existing);
        });

      const categorySpending = Array.from(catMap.entries())
        .map(([id, v]) => ({
          category_id: id,
          category_name: v.name,
          icon: v.icon,
          color: v.color,
          total_amount: v.amount,
          transaction_count: v.count,
          percentage: expenses > 0 ? (v.amount / expenses) * 100 : 0,
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      return {
        income,
        expenses,
        net,
        savingsRate,
        categorySpending,
        transactionCount: (data || []).length,
      };
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from("transactions")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
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
