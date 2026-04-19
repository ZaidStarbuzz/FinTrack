'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { Goal } from '../types'
import { GoalInput } from '../validations/transaction'
import { toast } from 'sonner'
import { differenceInMonths } from 'date-fns'

const supabase = createClient()

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('goals').select('*').order('priority').order('name')
      if (error) throw error
      return (data as Goal[]).map(g => ({
        ...g,
        percentage: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
        months_remaining: g.target_date ? Math.max(0, differenceInMonths(new Date(g.target_date), new Date())) : null,
      }))
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('goals').insert({ ...input, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal created') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<GoalInput> & { id: string }) => {
      const { data, error } = await supabase.from('goals').update(input).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}
