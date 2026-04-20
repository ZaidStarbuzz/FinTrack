"use client";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import {
  useNetWorth,
  useCreateAsset,
  useDeleteAsset,
} from "@/lib/hooks/useNetWorth";
import { useForm } from "react-hook-form";
import { Asset, AssetType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Building2,
  Car,
  Coins,
  BarChart3,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const ASSET_ICONS: Record<AssetType, string> = {
  real_estate: "🏠",
  vehicle: "🚗",
  gold: "🥇",
  stocks: "📈",
  mutual_funds: "📊",
  fd: "🏦",
  ppf: "📋",
  epf: "👔",
  crypto: "₿",
  business: "🏢",
  other: "📦",
};
const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#10b981",
  "#f43f5e",
  "#84cc16",
];

export default function NetWorthPage() {
  const { data, isLoading } = useNetWorth();
  const createMutation = useCreateAsset();
  const deleteMutation = useDeleteAsset();
  const [showForm, setShowForm] = useState(false);
  const form = useForm<Partial<Asset>>({
    defaultValues: { type: "real_estate", is_liquid: false },
  });

  const assetsByType = data
    ? data.assets.reduce(
        (acc, asset) => {
          acc[asset.type] = (acc[asset.type] || 0) + asset.current_value;
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};

  // Ensure pieData has explicit types so downstream uses (like formatCurrency)
  // know that `value` is a number (TS sometimes widens Object.entries values to unknown).
  const pieData: { name: string; value: number; icon: string }[] =
    Object.entries(assetsByType).map(([type, value]) => ({
      name: type.replace("_", " "),
      value: value as number,
      icon: ASSET_ICONS[type as AssetType],
    }));

  const accountsAssets = data
    ? data.accounts.filter(
        (a) => !a.is_excluded_from_net_worth && a.balance > 0,
      )
    : [];
  const accountsByType = accountsAssets.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + a.balance;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <DashboardLayout title="Net Worth">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Net worth hero */}
            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-background p-6">
              <p className="text-sm text-muted-foreground mb-2">
                Total Net Worth
              </p>
              <p
                className={`text-4xl font-bold mb-4 ${(data?.netWorth || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {formatCurrency(data?.netWorth || 0)}
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Assets</p>
                  <p className="text-xl font-bold text-green-500">
                    {formatCurrency(data?.totalAssets || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Liabilities
                  </p>
                  <p className="text-xl font-bold text-red-500">
                    {formatCurrency(data?.totalLiabilities || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Liquid Assets</p>
                  <p className="text-xl font-bold text-blue-500">
                    {formatCurrency(data?.liquidAssets || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Asset breakdown chart */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-4">Asset Breakdown</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          innerRadius={45}
                        >
                          {pieData.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => formatCurrency(Number(v || 0))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-1.5">
                      {pieData.map((item, i) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            />
                            <span className="capitalize">
                              {item.icon} {item.name}
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No assets added yet
                  </p>
                )}
              </div>

              {/* Account balances */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold mb-4">Account Balances</h3>
                <div className="space-y-2">
                  {data?.accounts
                    .filter((a) => a.balance !== 0)
                    .map((acc) => (
                      <div
                        key={acc.id}
                        className="flex justify-between items-center py-1.5 border-b last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{acc.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {acc.type.replace("_", " ")}
                          </p>
                        </div>
                        <p
                          className={`font-semibold text-sm ${acc.balance < 0 ? "text-red-500" : "text-green-500"}`}
                        >
                          {formatCurrency(acc.balance)}
                        </p>
                      </div>
                    ))}
                  {!data?.accounts.some((a) => a.balance !== 0) && (
                    <p className="text-sm text-muted-foreground">
                      No account balances
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Assets */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Manual Assets</h3>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Asset
                </button>
              </div>
              {data?.assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add real estate, gold, stocks, FDs, and other assets
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {data?.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-lg border group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {ASSET_ICONS[asset.type]}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{asset.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {asset.type.replace("_", " ")}
                          </p>
                          {asset.is_liquid && (
                            <span className="text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">
                              Liquid
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          {formatCurrency(asset.current_value)}
                        </p>
                        <button
                          onClick={() => deleteMutation.mutate(asset.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Add Asset</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded hover:bg-muted"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={form.handleSubmit(async (d) => {
                await createMutation.mutateAsync(d);
                setShowForm(false);
              })}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  {...form.register("name")}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. HDFC Mutual Fund"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type *
                  </label>
                  <select
                    {...form.register("type")}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(ASSET_ICONS).map(([type, icon]) => (
                      <option key={type} value={type}>
                        {icon} {type.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Value *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <input
                      type="number"
                      {...form.register("current_value", {
                        valueAsNumber: true,
                      })}
                      required
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Purchase Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <input
                      type="number"
                      {...form.register("purchase_value", {
                        valueAsNumber: true,
                      })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    {...form.register("purchase_date")}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...form.register("is_liquid")}
                  className="rounded"
                />
                <span className="text-sm">Is this a liquid asset?</span>
              </label>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Adding..." : "Add Asset"}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
