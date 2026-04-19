'use client'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { FilterBar } from '@/components/transactions/FilterBar'
import { TransactionList } from '@/components/transactions/TransactionList'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { useTransactionStats } from '@/lib/hooks/useTransactions'
import { useAppStore } from '@/lib/stores/useAppStore'
import { useImportCSV, useExportCSV } from '@/lib/hooks/useImportExport'
import { formatCurrency } from '@/lib/utils/format'
import { Plus, Upload, Download, ArrowDownLeft, ArrowUpRight, BarChart3 } from 'lucide-react'
import { useState, useRef } from 'react'
import Papa from 'papaparse'

export default function TransactionsPage() {
  const { transactionFilters } = useAppStore()
  const { data: stats } = useTransactionStats(transactionFilters)
  const [showAddTx, setShowAddTx] = useState(false)
  const importMutation = useImportCSV()
  const exportMutation = useExportCSV()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const firstAccount = prompt('Enter Account ID for import:')
        if (firstAccount) {
          importMutation.mutate({ rows: result.data as any[], accountId: firstAccount })
        }
      },
    })
    e.target.value = ''
  }

  return (
    <DashboardLayout title="Transactions">
      <div className="space-y-5">
        {/* Action bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-3">
            {stats && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span className="font-medium">{formatCurrency(stats.income)}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-medium">{formatCurrency(stats.expenses)}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium">{stats.savingsRate.toFixed(1)}% saved</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" />
              {importMutation.isPending ? 'Importing...' : 'Import CSV'}
            </button>
            <button
              onClick={() => exportMutation.mutate({})}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowAddTx(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        <FilterBar />
        <TransactionList filters={transactionFilters} />
      </div>

      {showAddTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New Transaction</h2>
              <button onClick={() => setShowAddTx(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">✕</button>
            </div>
            <TransactionForm onSuccess={() => setShowAddTx(false)} />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
