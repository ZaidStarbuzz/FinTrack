'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '../supabase/client'
import { Loan } from '../types'
import { LoanInput } from '../validations/transaction'
import { toast } from 'sonner'
import { differenceInMonths, addMonths } from 'date-fns'
import { calculateLoanSchedule } from '../utils/financial'

const supabase = createClient()

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loans').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data as Loan[]).map(loan => {
        const endDate = addMonths(new Date(loan.start_date), loan.tenure_months)
        const months_remaining = Math.max(0, differenceInMonths(endDate, new Date()))
        const completion_percentage = ((loan.tenure_months - months_remaining) / loan.tenure_months) * 100
        return { ...loan, months_remaining, completion_percentage }
      })
    },
  })
}

export function useCreateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LoanInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { schedule } = calculateLoanSchedule(input.principal_amount, input.interest_rate, input.tenure_months)
      const outstanding_balance = input.principal_amount
      const { data, error } = await supabase.from('loans').insert({
        ...input, user_id: user.id, outstanding_balance,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan added') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function usePayLoanEMI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ loanId, accountId }: { loanId: string; accountId: string }) => {
      const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single()
      if (!loan) throw new Error('Loan not found')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const monthlyRate = loan.interest_rate / 100 / 12
      const interest = loan.outstanding_balance * monthlyRate
      const principal = loan.emi_amount - interest

      await supabase.from('transactions').insert({
        user_id: user.id, account_id: accountId, type: 'expense',
        amount: loan.emi_amount, description: `EMI - ${loan.name}`,
        date: new Date().toISOString(), loan_id: loanId, status: 'completed',
      })
      await supabase.from('loans').update({
        outstanding_balance: Math.max(0, loan.outstanding_balance - principal),
        total_paid: loan.total_paid + loan.emi_amount,
        total_interest_paid: loan.total_interest_paid + interest,
      }).eq('id', loanId)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['transactions'] }); toast.success('EMI recorded') },
    onError: (e: Error) => toast.error(e.message),
  })
}
