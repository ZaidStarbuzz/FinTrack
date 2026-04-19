'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { Asset } from '../types'
import { toast } from 'sonner'

const supabase = createClient()

export function useNetWorth() {
  return useQuery({
    queryKey: ['net-worth'],
    queryFn: async () => {
      const [assetsRes, accountsRes, loansRes] = await Promise.all([
        supabase.from('assets').select('*').order('type'),
        supabase.from('accounts').select('balance,type,is_excluded_from_net_worth').eq('status', 'active'),
        supabase.from('loans').select('outstanding_balance').eq('status', 'active'),
      ])

      const assets = assetsRes.data || []
      const accounts = accountsRes.data || []
      const loans = loansRes.data || []

      const manualAssets = assets.reduce((s, a) => s + a.current_value, 0)
      const accountAssets = accounts
        .filter(a => !a.is_excluded_from_net_worth && a.balance > 0)
        .reduce((s, a) => s + a.balance, 0)
      const liquidAssets = accounts.filter(a => ['bank','cash','wallet'].includes(a.type) && a.balance > 0).reduce((s, a) => s + a.balance, 0)

      const totalAssets = manualAssets + accountAssets
      const totalLiabilities = loans.reduce((s, l) => s + (l.outstanding_balance || 0), 0)
      const netWorth = totalAssets - totalLiabilities

      return { assets, totalAssets, totalLiabilities, netWorth, liquidAssets, accounts }
    },
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Asset>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('assets').insert({ ...input, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['net-worth'] }); toast.success('Asset added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Asset> & { id: string }) => {
      const { data, error } = await supabase.from('assets').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['net-worth'] }); toast.success('Asset updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['net-worth'] }); toast.success('Asset removed') },
    onError: (e: Error) => toast.error(e.message),
  })
}
