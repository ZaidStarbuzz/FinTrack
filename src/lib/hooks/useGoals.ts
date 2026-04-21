// "use client";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { createClient } from "../supabase/client";
// import { getCurrentUser } from "@/lib/session";
// import { Goal } from "../types";
// import { GoalInput } from "../validations/transaction";
// import { toast } from "sonner";
// import { differenceInMonths } from "date-fns";

// const supabase = createClient();

// export function useGoals() {
//   return useQuery({
//     queryKey: ["goals"],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from("goals")
//         .select("*")
//         .order("priority")
//         .order("name");
//       if (error) throw error;
//       return (data as Goal[]).map((g) => ({
//         ...g,
//         percentage:
//           g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
//         months_remaining: g.target_date
//           ? Math.max(0, differenceInMonths(new Date(g.target_date), new Date()))
//           : null,
//       }));
//     },
//   });
// }

// export function useCreateGoal() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (input: GoalInput) => {
//       const user = await getCurrentUser();
//       if (!user) throw new Error("Not authenticated");
//       const { data, error } = await supabase
//         .from("goals")
//         .insert({ ...input, user_id: user.id })
//         .select()
//         .single();
//       if (error) throw error;
//       return data;
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["goals"] });
//       toast.success("Goal created");
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });
// }

// export function useUpdateGoal() {
//   const qc = useQueryClient();
//   return useMutation({
//     // Accept Partial<Goal> here (not just GoalInput) because updates may include
//     // server-only fields like `status` or other derived properties.
//     mutationFn: async ({ id, ...input }: Partial<Goal> & { id: string }) => {
//       const { data, error } = await supabase
//         .from("goals")
//         .update(input)
//         .eq("id", id)
//         .select()
//         .single();
//       if (error) throw error;
//       return data;
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["goals"] });
//       toast.success("Goal updated");
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });
// }
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Goal } from "../types";
import { GoalInput } from "../validations/transaction";
import { toast } from "sonner";
import { differenceInMonths } from "date-fns";

/**
 * FETCH
 */
export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals", {
        method: "GET",
        credentials: "include",
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to fetch goals");

      const goals = payload.goals as Goal[];

      // derived fields (same logic you had)
      return goals.map((g) => ({
        ...g,
        percentage:
          g.target_amount > 0
            ? (g.current_amount / g.target_amount) * 100
            : 0,
        months_remaining: g.target_date
          ? Math.max(
            0,
            differenceInMonths(new Date(g.target_date), new Date()),
          )
          : null,
      }));
    },
  });
}

/**
 * CREATE
 */
export function useCreateGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to create goal");

      return payload.goal;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal created");
    },

    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * UPDATE
 */
export function useUpdateGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Goal> & { id: string }) => {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...input }),
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to update goal");

      return payload.goal;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal updated");
    },

    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * DELETE (new)
 */
export function useDeleteGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/goals", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const payload = await res.json();

      if (!res.ok)
        throw new Error(payload?.error || "Failed to delete goal");
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted");
    },

    onError: (e: Error) => toast.error(e.message),
  });
}