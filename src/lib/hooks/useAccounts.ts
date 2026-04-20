"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { getCurrentUser } from "@/lib/session";
import { Account } from "../types";
import { AccountInput } from "../validations/transaction";
import { toast } from "sonner";

const supabase = createClient();

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts", { credentials: "include" });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to fetch accounts");
      // server returns { accounts }
      return payload.accounts as Account[];
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      // create via server API so we don't run into RLS issues when using custom JWTs
      const res = await fetch("/api/accounts", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to create account");
      return payload.account;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<AccountInput> & { id: string }) => {
      const res = await fetch("/api/accounts", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...input }),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to update account");
      return payload.account;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.error || "Failed to delete account");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account closed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
