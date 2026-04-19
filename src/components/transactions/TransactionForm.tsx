'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionInput } from '@/lib/validations/transaction'
import { useAccounts } from '@/lib/hooks/useAccounts'
import { useFlatCategories } from '@/lib/hooks/useCategories'
import { useCreateTransaction, useUpdateTransaction } from '@/lib/hooks/useTransactions'
import { Transaction } from '@/lib/types'
import { format } from 'date-fns'

interface Props {
  transaction?: Transaction
  onSuccess?: () => void
}

export function TransactionForm({ transaction, onSuccess }: Props) {
  const { data: accounts = [] } = useAccounts()
  const { data: expenseCategories = [] } = useFlatCategories('expense')
  const { data: incomeCategories = [] } = useFlatCategories('income')
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction ? {
      account_id: transaction.account_id,
      transfer_account_id: transaction.transfer_account_id || undefined,
      category_id: transaction.category_id || undefined,
      type: transaction.type,
      amount: transaction.amount,
      date: format(new Date(transaction.date), "yyyy-MM-dd'T'HH:mm"),
      description: transaction.description || '',
      notes: transaction.notes || '',
      tags: transaction.tags || [],
      merchant: transaction.merchant || '',
    } : {
      type: 'expense',
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      tags: [],
    },
  })

  const type = form.watch('type')
  const categories = type === 'income' ? incomeCategories : expenseCategories

  const onSubmit = async (data: TransactionInput) => {
    if (transaction) {
      await updateMutation.mutateAsync({ id: transaction.id, ...data })
    } else {
      await createMutation.mutateAsync(data)
    }
    onSuccess?.()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Type Tabs */}
      <div className="flex rounded-lg border overflow-hidden">
        {(['expense', 'income', 'transfer'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => form.setValue('type', t)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
              type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : t === 'income' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                : 'hover:bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium mb-1">Amount *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2.5 rounded-lg border bg-background text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            {...form.register('amount', { valueAsNumber: true })}
          />
        </div>
        {form.formState.errors.amount && <p className="text-xs text-red-500 mt-1">{form.formState.errors.amount.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description *</label>
        <input
          placeholder="What was this transaction for?"
          className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          {...form.register('description')}
        />
        {form.formState.errors.description && <p className="text-xs text-red-500 mt-1">{form.formState.errors.description.message}</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium mb-1">Date & Time *</label>
        <input
          type="datetime-local"
          className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          {...form.register('date')}
        />
      </div>

      {/* Account */}
      <div>
        <label className="block text-sm font-medium mb-1">Account *</label>
        <select
          className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          {...form.register('account_id')}
        >
          <option value="">Select account</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {form.formState.errors.account_id && <p className="text-xs text-red-500 mt-1">{form.formState.errors.account_id.message}</p>}
      </div>

      {/* Transfer account */}
      {type === 'transfer' && (
        <div>
          <label className="block text-sm font-medium mb-1">Transfer To *</label>
          <select
            className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            {...form.register('transfer_account_id')}
          >
            <option value="">Select destination account</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category */}
      {type !== 'transfer' && (
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            {...form.register('category_id')}
          >
            <option value="">Uncategorized</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Merchant */}
      <div>
        <label className="block text-sm font-medium mb-1">Merchant</label>
        <input
          placeholder="e.g. Swiggy, Amazon"
          className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          {...form.register('merchant')}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          rows={2}
          placeholder="Optional notes..."
          className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          {...form.register('notes')}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : transaction ? 'Update Transaction' : 'Add Transaction'}
      </button>
    </form>
  )
}
