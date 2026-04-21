// "use client";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { createClient } from "../supabase/client";
// import { getCurrentUser } from "@/lib/session";
// import { Budget } from "../types";
// import { BudgetInput } from "../validations/transaction";
// import { startOfMonth, endOfMonth } from "date-fns";
// import { toast } from "sonner";

// const supabase = createClient();

// export function useBudgets() {
//   return useQuery({
//     queryKey: ["budgets"],
//     queryFn: async () => {
//       const now = new Date();
//       const monthStart = startOfMonth(now).toISOString();
//       const monthEnd = endOfMonth(now).toISOString();

//       const { data: budgets, error } = await supabase
//         .from("budgets")
//         .select("*, category:categories(*)")
//         .eq("is_active", true)
//         .order("name");
//       if (error) throw error;

//       // Calculate spent for each budget
//       const budgetsWithSpent = await Promise.all(
//         (budgets as Budget[]).map(async (budget) => {
//           let query = supabase
//             .from("transactions")
//             .select("amount")
//             .eq("type", "expense")
//             .neq("status", "void")
//             .gte("date", monthStart)
//             .lte("date", monthEnd);

//           if (budget.category_id)
//             query = query.eq("category_id", budget.category_id);

//           const { data: txs } = await query;
//           const spent = (txs || []).reduce((s, t) => s + t.amount, 0);
//           const percentage = (spent / budget.amount) * 100;

//           return {
//             ...budget,
//             spent,
//             remaining: budget.amount - spent,
//             percentage,
//           };
//         }),
//       );

//       return budgetsWithSpent;
//     },
//   });
// }

// export function useCreateBudget() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (input: BudgetInput) => {
//       const user = await getCurrentUser();
//       if (!user) throw new Error("Not authenticated");
//       const { data, error } = await supabase
//         .from("budgets")
//         .insert({ ...input, user_id: user.id })
//         .select()
//         .single();
//       if (error) throw error;
//       return data;
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["budgets"] });
//       toast.success("Budget created");
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });
// }

// export function useUpdateBudget() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async ({
//       id,
//       ...input
//     }: Partial<BudgetInput> & { id: string }) => {
//       const { data, error } = await supabase
//         .from("budgets")
//         .update(input)
//         .eq("id", id)
//         .select()
//         .single();
//       if (error) throw error;
//       return data;
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["budgets"] });
//       toast.success("Budget updated");
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });
// }

// export function useDeleteBudget() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (id: string) => {
//       const { error } = await supabase.from("budgets").delete().eq("id", id);
//       if (error) throw error;
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["budgets"] });
//       toast.success("Budget deleted");
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });
// }

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Budget } from "../types";
import { BudgetInput } from "../validations/transaction";
import { toast } from "sonner";

/**
 * FETCH BUDGETS
 */
export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const res = await fetch("/api/budgets", {
        method: "GET",
        credentials: "include",
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to fetch budgets");

      return payload.budgets as Budget[];
    },
  });
}

/**
 * CREATE
 */
export function useCreateBudget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: BudgetInput) => {
      const res = await fetch("/api/budgets", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to create budget");

      return payload.budget;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created");
    },

    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * UPDATE
 */
export function useUpdateBudget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<BudgetInput> & { id: string }) => {
      const res = await fetch("/api/budgets", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...input }),
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to update budget");

      return payload.budget;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget updated");
    },

    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * DELETE
 */
export function useDeleteBudget() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/budgets", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to delete budget");
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget deleted");
    },

    onError: (e: Error) => toast.error(e.message),
  });
}