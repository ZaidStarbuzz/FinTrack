"use client";
import { useState } from "react";
import {
  useTransactions,
  useDeleteTransaction,
} from "@/lib/hooks/useTransactions";
import { TransactionFilters, Transaction } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { TransactionForm } from "./TransactionForm";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { cn } from "@/lib/utils/format";

interface Props {
  filters: TransactionFilters;
}

export function TransactionList({ filters }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useTransactions(filters);
  const deleteMutation = useDeleteTransaction();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allTransactions = data?.pages.flatMap((p) => p.data) || [];
  const totalCount = data?.pages[0]?.count || 0;
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (allTransactions.length === 0)
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No transactions found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    );

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        {totalCount} transactions
      </p>
      <div className="space-y-1.5">
        {allTransactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
          >
            {/* Type icon */}
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                tx.type === "income"
                  ? "bg-green-500/10 text-green-500"
                  : tx.type === "expense"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-blue-500/10 text-blue-500",
              )}
            >
              {tx.type === "income" ? (
                <ArrowDownLeft className="w-4 h-4" />
              ) : tx.type === "expense" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowLeftRight className="w-4 h-4" />
              )}
            </div>

            {/* Category icon */}
            {tx.category && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: tx.category.color + "20" }}
              >
                {tx.category.icon}
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{tx.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(tx.date, "dd MMM, hh:mm a")}</span>
                {tx.account && <span>• {tx.account.name}</span>}
                {tx.category && <span>• {tx.category.name}</span>}
                {tx.merchant && <span>• {tx.merchant}</span>}
              </div>
              {tx.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {tx.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
              <p
                className={cn(
                  "font-semibold",
                  tx.type === "income"
                    ? "text-green-500"
                    : tx.type === "expense"
                      ? "text-red-500"
                      : "text-blue-500",
                )}
              >
                {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : "↔"}
                {formatCurrency(tx.amount)}
              </p>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  tx.status === "completed"
                    ? "bg-green-500/10 text-green-600"
                    : tx.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {tx.status}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingTx(tx)}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {deleteConfirm === tx.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      deleteMutation.mutate(tx.id);
                      setDeleteConfirm(null);
                    }}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 text-xs bg-muted rounded"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(tx.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={ref} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        )}
        {!hasNextPage && allTransactions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            All transactions loaded
          </p>
        )}
      </div>

      {/* Edit modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Edit Transaction</h2>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 rounded hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <TransactionForm
              transaction={editingTx}
              onSuccess={() => setEditingTx(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
