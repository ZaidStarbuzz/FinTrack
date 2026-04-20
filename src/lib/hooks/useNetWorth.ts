"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { getCurrentUser } from "@/lib/session";
import { Asset, Account } from "../types";
import { toast } from "sonner";

const supabase = createClient();

export function useNetWorth() {
  return useQuery<{
    assets: Asset[];
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    liquidAssets: number;
    accounts: Account[];
  }>({
    queryKey: ["net-worth"],
    queryFn: async () => {
      const res = await fetch('/api/net-worth', { credentials: 'include' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to fetch net worth')
      return {
        assets: payload.assets || [],
        totalAssets: payload.totalAssets || 0,
        totalLiabilities: payload.totalLiabilities || 0,
        netWorth: payload.netWorth || 0,
        liquidAssets: payload.liquidAssets || 0,
        accounts: payload.accounts || [],
      }
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Asset>) => {
      const res = await fetch('/api/assets', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to create asset')
      return payload.asset
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["net-worth"] });
      toast.success("Asset added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Asset> & { id: string }) => {
      const res = await fetch('/api/assets', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...input }) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to update asset')
      return payload.asset
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["net-worth"] });
      toast.success("Asset updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/assets', { method: 'DELETE', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to delete asset')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["net-worth"] });
      toast.success("Asset removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
