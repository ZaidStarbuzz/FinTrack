"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { getCurrentUser } from "@/lib/session";
import { toast } from "sonner";
import { format } from "date-fns";

const supabase = createClient();

interface CSVRow {
  date: string;
  description: string;
  amount: string;
  type?: string;
  category?: string;
  notes?: string;
  tags?: string;
}

export function useImportCSV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      accountId,
    }: {
      rows: CSVRow[];
      accountId: string;
    }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { data: categories } = await supabase
        .from("categories")
        .select("id,name");
      const catMap = new Map(
        (categories || []).map((c) => [c.name.toLowerCase(), c.id]),
      );

      const transactions = rows
        .map((row) => {
          const hash = btoa(
            `${row.date}-${row.description}-${row.amount}`,
          ).slice(0, 32);
          const categoryId = row.category
            ? catMap.get(row.category.toLowerCase())
            : null;
          const amount = Math.abs(
            parseFloat(row.amount.replace(/[^0-9.-]/g, "")),
          );
          const type =
            row.type?.toLowerCase() === "income"
              ? "income"
              : row.type?.toLowerCase() === "transfer"
                ? "transfer"
                : parseFloat(row.amount) < 0
                  ? "expense"
                  : row.type === "income"
                    ? "income"
                    : "expense";
          return {
            user_id: user.id,
            account_id: accountId,
            type,
            amount,
            date: new Date(row.date).toISOString(),
            description: row.description,
            notes: row.notes || null,
            tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
            category_id: categoryId || null,
            status: "completed",
            import_hash: hash,
          };
        })
        .filter((t) => !isNaN(t.amount) && t.amount > 0);

      // Upsert with import_hash to prevent duplicates
      const { data, error } = await supabase
        .from("transactions")
        .upsert(transactions, {
          onConflict: "import_hash",
          ignoreDuplicates: true,
        })
        .select();

      if (error) throw error;
      return { imported: data?.length || 0, total: transactions.length };
    },
    onSuccess: (result) => {
      const qcInvalidate = () => {
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["accounts"] });
        qc.invalidateQueries({ queryKey: ["transaction-stats"] });
      };
      qcInvalidate();
      toast.success(
        `Imported ${result.imported} of ${result.total} transactions`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useExportCSV() {
  return useMutation({
    mutationFn: async (filters: { from?: string; to?: string }) => {
      let query = supabase
        .from("transactions")
        .select("*, account:accounts(name), category:categories(name)")
        .order("date", { ascending: false });

      if (filters.from) query = query.gte("date", filters.from);
      if (filters.to) query = query.lte("date", filters.to);

      const { data, error } = await query;
      if (error) throw error;

      const headers = [
        "Date",
        "Description",
        "Amount",
        "Type",
        "Account",
        "Category",
        "Tags",
        "Notes",
        "Status",
      ];
      const rows = (data || []).map((t) => [
        format(new Date(t.date), "yyyy-MM-dd"),
        t.description || "",
        t.type === "expense" ? `-${t.amount}` : t.amount,
        t.type,
        (t as any).account?.name || "",
        (t as any).category?.name || "",
        (t.tags || []).join(";"),
        t.notes || "",
        t.status,
      ]);

      const csv = [headers, ...rows]
        .map((r) => r.map((v) => `"${v}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fintrack-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return { count: data?.length || 0 };
    },
    onSuccess: (r) => toast.success(`Exported ${r.count} transactions`),
    onError: (e: Error) => toast.error(e.message),
  });
}
