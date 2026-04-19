// =============================================
// FINTRACK PRO — Seed Data
// Run: npx ts-node supabase/seed/index.ts
// =============================================
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function seed() {
  console.log("🌱 Seeding default categories...");

  const defaultCategories = [
    // Expense categories
    {
      name: "Food & Dining",
      icon: "🍔",
      color: "#f97316",
      type: "expense",
      is_system: true,
      sort_order: 1,
    },
    {
      name: "Petrol & Fuel",
      icon: "⛽",
      color: "#f59e0b",
      type: "expense",
      is_system: true,
      sort_order: 2,
    },
    {
      name: "Rent",
      icon: "🏠",
      color: "#6366f1",
      type: "expense",
      is_system: true,
      sort_order: 3,
    },
    {
      name: "Utilities",
      icon: "⚡",
      color: "#22c55e",
      type: "expense",
      is_system: true,
      sort_order: 4,
    },
    {
      name: "Shopping",
      icon: "🛍️",
      color: "#ec4899",
      type: "expense",
      is_system: true,
      sort_order: 5,
    },
    {
      name: "Entertainment",
      icon: "🎬",
      color: "#8b5cf6",
      type: "expense",
      is_system: true,
      sort_order: 6,
    },
    {
      name: "Healthcare",
      icon: "🏥",
      color: "#ef4444",
      type: "expense",
      is_system: true,
      sort_order: 7,
    },
    {
      name: "Education",
      icon: "📚",
      color: "#06b6d4",
      type: "expense",
      is_system: true,
      sort_order: 8,
    },
    {
      name: "Travel",
      icon: "✈️",
      color: "#14b8a6",
      type: "expense",
      is_system: true,
      sort_order: 9,
    },
    {
      name: "Transport",
      icon: "🚗",
      color: "#f97316",
      type: "expense",
      is_system: true,
      sort_order: 10,
    },
    {
      name: "Groceries",
      icon: "🛒",
      color: "#84cc16",
      type: "expense",
      is_system: true,
      sort_order: 11,
    },
    {
      name: "Insurance",
      icon: "🛡️",
      color: "#64748b",
      type: "expense",
      is_system: true,
      sort_order: 12,
    },
    {
      name: "EMI/Loan",
      icon: "🏦",
      color: "#dc2626",
      type: "expense",
      is_system: true,
      sort_order: 13,
    },
    {
      name: "Subscriptions",
      icon: "📺",
      color: "#7c3aed",
      type: "expense",
      is_system: true,
      sort_order: 14,
    },
    {
      name: "Clothing",
      icon: "👕",
      color: "#db2777",
      type: "expense",
      is_system: true,
      sort_order: 15,
    },
    {
      name: "Personal Care",
      icon: "💆",
      color: "#be185d",
      type: "expense",
      is_system: true,
      sort_order: 16,
    },
    {
      name: "Gifts",
      icon: "🎁",
      color: "#d97706",
      type: "expense",
      is_system: true,
      sort_order: 17,
    },
    {
      name: "Chit Fund",
      icon: "🪙",
      color: "#92400e",
      type: "expense",
      is_system: true,
      sort_order: 18,
    },
    {
      name: "Investment",
      icon: "📈",
      color: "#065f46",
      type: "expense",
      is_system: true,
      sort_order: 19,
    },
    {
      name: "Miscellaneous",
      icon: "📦",
      color: "#6b7280",
      type: "expense",
      is_system: true,
      sort_order: 20,
    },
    // Income categories
    {
      name: "Salary",
      icon: "💼",
      color: "#22c55e",
      type: "income",
      is_system: true,
      sort_order: 1,
    },
    {
      name: "Freelance",
      icon: "💻",
      color: "#06b6d4",
      type: "income",
      is_system: true,
      sort_order: 2,
    },
    {
      name: "Business",
      icon: "🏢",
      color: "#6366f1",
      type: "income",
      is_system: true,
      sort_order: 3,
    },
    {
      name: "Rental Income",
      icon: "🏘️",
      color: "#8b5cf6",
      type: "income",
      is_system: true,
      sort_order: 4,
    },
    {
      name: "Investment Returns",
      icon: "📈",
      color: "#f59e0b",
      type: "income",
      is_system: true,
      sort_order: 5,
    },
    {
      name: "Chit Fund Payout",
      icon: "🪙",
      color: "#92400e",
      type: "income",
      is_system: true,
      sort_order: 6,
    },
    {
      name: "Bonus",
      icon: "🎉",
      color: "#f97316",
      type: "income",
      is_system: true,
      sort_order: 7,
    },
    {
      name: "Gift Received",
      icon: "🎁",
      color: "#ec4899",
      type: "income",
      is_system: true,
      sort_order: 8,
    },
    {
      name: "Refund",
      icon: "💰",
      color: "#14b8a6",
      type: "income",
      is_system: true,
      sort_order: 9,
    },
    {
      name: "Other Income",
      icon: "💵",
      color: "#84cc16",
      type: "income",
      is_system: true,
      sort_order: 10,
    },
  ];

  const { error } = await supabase
    .from("categories")
    .upsert(defaultCategories, { onConflict: "name,type" });
  if (error) console.error("Error seeding categories:", error);
  else console.log(`✅ Seeded ${defaultCategories.length} default categories`);

  // Seed achievements
  const achievements = [
    {
      code: "first_transaction",
      name: "First Step",
      description: "Add your first transaction",
      icon: "🎯",
      points: 10,
      category: "transactions",
    },
    {
      code: "budget_master",
      name: "Budget Master",
      description: "Stay under budget for a full month",
      icon: "🏆",
      points: 50,
      category: "budgets",
    },
    {
      code: "goal_reached",
      name: "Goal Getter",
      description: "Complete your first savings goal",
      icon: "🌟",
      points: 100,
      category: "goals",
    },
    {
      code: "streak_7",
      name: "Week Warrior",
      description: "7-day tracking streak",
      icon: "🔥",
      points: 30,
      category: "streaks",
    },
    {
      code: "streak_30",
      name: "Month Master",
      description: "30-day tracking streak",
      icon: "💪",
      points: 100,
      category: "streaks",
    },
    {
      code: "saver_20",
      name: "Super Saver",
      description: "Save 20%+ of income in a month",
      icon: "💰",
      points: 75,
      category: "savings",
    },
    {
      code: "chit_first",
      name: "Chit Champion",
      description: "Track your first chit fund",
      icon: "🪙",
      points: 25,
      category: "chit_funds",
    },
    {
      code: "net_worth_positive",
      name: "In the Black",
      description: "Achieve positive net worth",
      icon: "📈",
      points: 150,
      category: "net_worth",
    },
    {
      code: "transactions_100",
      name: "Century Club",
      description: "Record 100 transactions",
      icon: "💯",
      points: 50,
      category: "transactions",
    },
    {
      code: "loan_paid",
      name: "Debt Slayer",
      description: "Pay off a loan completely",
      icon: "⚔️",
      points: 200,
      category: "loans",
    },
  ];

  const { error: achError } = await supabase
    .from("achievements")
    .upsert(achievements, { onConflict: "code" });
  if (achError) console.error("Error seeding achievements:", achError);
  else console.log(`✅ Seeded ${achievements.length} achievements`);

  console.log("✅ Seed complete!");
}

seed().catch(console.error);
