import { z } from 'zod'

const emptyToNull = (val: any) => val === '' ? null : val

export const transactionSchema = z.object({
  account_id: z.string().uuid('Select an account'),

  transfer_account_id: z.preprocess(
    emptyToNull,
    z.string().uuid().nullable().optional()
  ),

  category_id: z.preprocess(
    emptyToNull,
    z.string().uuid().nullable().optional()
  ),

  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive('Amount must be positive'),
  date: z.string(),
  description: z.string().min(1, 'Description is required').max(255),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  merchant: z.string().optional().nullable(),
  reference_number: z.string().optional().nullable(),
})
  .superRefine((data, ctx) => {
    if (data.type === 'transfer') {
      if (!data.transfer_account_id) {
        ctx.addIssue({
          path: ['transfer_account_id'],
          code: z.ZodIssueCode.custom,
          message: 'Transfer account is required',
        })
      }

      if (data.account_id === data.transfer_account_id) {
        ctx.addIssue({
          path: ['transfer_account_id'],
          code: z.ZodIssueCode.custom,
          message: 'Cannot transfer to same account',
        })
      }
    }

    if (data.type !== 'transfer' && !data.category_id) {
      ctx.addIssue({
        path: ['category_id'],
        code: z.ZodIssueCode.custom,
        message: 'Category is required',
      })
    }
  })
// export const transactionSchema = z.object({
//   account_id: z.string().uuid('Select an account'),
//   transfer_account_id: z.string().uuid().optional().nullable(),
//   category_id: z.string().uuid().optional().nullable(),
//   type: z.enum(['income', 'expense', 'transfer']),
//   amount: z.number().positive('Amount must be positive'),
//   date: z.string(),
//   description: z.string().min(1, 'Description is required').max(255),
//   notes: z.string().optional().nullable(),
//   tags: z.array(z.string()).default([]),
//   merchant: z.string().optional().nullable(),
//   reference_number: z.string().optional().nullable(),
// })

export const accountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['bank', 'cash', 'credit_card', 'wallet', 'investment', 'loan', 'fixed_deposit']),
  balance: z.number().default(0),
  currency: z.string().default('INR'),
  color: z.string().optional(),
  credit_limit: z.number().optional().nullable(),
  billing_cycle_day: z.number().min(1).max(31).optional().nullable(),
  due_date_day: z.number().min(1).max(31).optional().nullable(),
  interest_rate: z.number().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  account_number_last4: z.string().max(4).optional().nullable(),
})

export const budgetSchema = z.object({
  name: z.string().min(1).max(100),
  category_id: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  rollover: z.boolean().default(false),
  alert_at_50: z.boolean().default(true),
  alert_at_80: z.boolean().default(true),
  alert_at_100: z.boolean().default(true),
})

export const goalSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  icon: z.string().default('target'),
  color: z.string().default('#22c55e'),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).default(0),
  target_date: z.string().optional().nullable(),
  priority: z.number().min(1).max(5).default(1),
  monthly_contribution: z.number().positive().optional().nullable(),
})

export const chitFundSchema = z.object({
  name: z.string().min(1).max(100),
  total_amount: z.number().positive(),
  monthly_contribution: z.number().positive(),
  duration_months: z.number().int().positive(),
  start_date: z.string(),
  payout_month: z.number().int().min(1).optional().nullable(),
  payout_amount: z.number().positive().optional().nullable(),
  organizer_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const loanSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['personal', 'home', 'auto', 'education', 'business', 'credit_card', 'other']),
  lender_name: z.string().optional().nullable(),
  principal_amount: z.number().positive(),
  interest_rate: z.number().positive(),
  tenure_months: z.number().int().positive(),
  start_date: z.string(),
  emi_amount: z.number().positive(),
  emi_due_day: z.number().int().min(1).max(31).default(1),
  notes: z.string().optional().nullable(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type AccountInput = z.infer<typeof accountSchema>
export type BudgetInput = z.infer<typeof budgetSchema>
export type GoalInput = z.infer<typeof goalSchema>
export type ChitFundInput = z.infer<typeof chitFundSchema>
export type LoanInput = z.infer<typeof loanSchema>
