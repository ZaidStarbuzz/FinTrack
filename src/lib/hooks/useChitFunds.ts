"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../supabase/client";
import { getCurrentUser } from "@/lib/session";
import { ChitFund } from "../types";
import { ChitFundInput } from "../validations/transaction";
import { toast } from "sonner";
import { addMonths, differenceInMonths } from "date-fns";

const supabase = createClient();

export function useChitFunds() {
  return useQuery({
    queryKey: ["chit-funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chit_funds")
        .select("*, payments:chit_fund_payments(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data as ChitFund[]).map((cf) => {
        const payments = cf.payments || [];
        const paidPayments = payments.filter(
          (p) => p.status === "paid" && !p.is_payout,
        );
        const payoutPayments = payments.filter(
          (p) => p.is_payout && p.status === "paid",
        );
        const total_contributed = paidPayments.reduce(
          (s, p) => s + p.amount,
          0,
        );
        const total_received = payoutPayments.reduce((s, p) => s + p.amount, 0);
        const expected_payout = cf.payout_amount || cf.total_amount;
        const net_profit_loss = total_received - total_contributed;
        const months_remaining = Math.max(
          0,
          differenceInMonths(
            addMonths(new Date(cf.start_date), cf.duration_months),
            new Date(),
          ),
        );
        const roi =
          total_contributed > 0
            ? ((total_received - total_contributed) / total_contributed) * 100
            : 0;

        return {
          ...cf,
          total_contributed,
          total_received,
          net_profit_loss,
          months_remaining,
          roi,
        };
      });
    },
  });
}

export function useCreateChitFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChitFundInput) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("chit_funds")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Generate payment schedule
      const payments = Array.from(
        { length: input.duration_months },
        (_, i) => ({
          chit_fund_id: data.id,
          user_id: user.id,
          month_number: i + 1,
          due_date: addMonths(new Date(input.start_date), i)
            .toISOString()
            .split("T")[0],
          amount:
            i + 1 === input.payout_month
              ? input.payout_amount || input.total_amount
              : input.monthly_contribution,
          is_payout: i + 1 === input.payout_month,
          status: "pending",
        }),
      );
      await supabase.from("chit_fund_payments").insert(payments);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chit-funds"] });
      toast.success("Chit fund created with payment schedule");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkChitPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paymentId,
      accountId,
    }: {
      paymentId: string;
      accountId: string;
    }) => {
      const { data: payment } = await supabase
        .from("chit_fund_payments")
        .select("*")
        .eq("id", paymentId)
        .single();
      if (!payment) throw new Error("Payment not found");
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      // Create transaction
      const { data: tx } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: accountId,
          type: payment.is_payout ? "income" : "expense",
          amount: payment.amount,
          description: payment.is_payout
            ? `Chit fund payout`
            : `Chit fund contribution - Month ${payment.month_number}`,
          date: new Date().toISOString(),
          chit_fund_id: payment.chit_fund_id,
          status: "completed",
        })
        .select()
        .single();

      // Update payment
      await supabase
        .from("chit_fund_payments")
        .update({
          status: "paid",
          paid_date: new Date().toISOString().split("T")[0],
          transaction_id: tx?.id,
        })
        .eq("id", paymentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chit-funds"] });
      toast.success("Payment marked as paid");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
