'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { Category } from '../types'
import { toast } from 'sonner'

const supabase = createClient()

export function useCategories(type?: 'income' | 'expense' | 'both') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      let query = supabase.from('categories').select('*').order('sort_order').order('name')
      if (type) query = query.or(`type.eq.${type},type.eq.both`)
      const { data, error } = await query
      if (error) throw error
      // Build tree
      const cats = data as Category[]
      const rootCats = cats.filter(c => !c.parent_id)
      rootCats.forEach(rc => {
        rc.children = cats.filter(c => c.parent_id === rc.id)
      })
      return rootCats
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useFlatCategories(type?: 'income' | 'expense') {
  return useQuery({
    queryKey: ['categories-flat', type],
    queryFn: async () => {
      let query = supabase.from('categories').select('*').order('name')
      if (type) query = query.or(`type.eq.${type},type.eq.both`)
      const { data, error } = await query
      if (error) throw error
      return data as Category[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Category>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('categories').insert({ ...input, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category created') },
    onError: (e: Error) => toast.error(e.message),
  })
}
