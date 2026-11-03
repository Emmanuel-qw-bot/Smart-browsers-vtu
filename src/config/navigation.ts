import {
  LayoutDashboard, Wallet, Wifi, Smartphone, ArrowLeftRight, Receipt, Gift, Users,
  Zap, Megaphone, Bell, LifeBuoy, BarChart3, UserCog, Server, CreditCard, Tags,
  BadgePercent, Share2, Crown, PartyPopper, Sparkles, ShieldCheck, LineChart,
  Headphones, Settings, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  slug: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const customerNav: NavItem[] = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Your balance, quick actions and recent activity." },
  { slug: "wallet", label: "Wallet", icon: Wallet, description: "Fund your wallet and review your balance history." },
  { slug: "buy-data", label: "Buy Data", icon: Wifi, description: "Data bundles for MTN, Airtel, Glo and 9mobile." },
  { slug: "buy-airtime", label: "Buy Airtime", icon: Smartphone, description: "Instant airtime top-up for any Nigerian network." },
  { slug: "airtime-to-cash", label: "Airtime to Cash", icon: ArrowLeftRight, description: "Convert surplus airtime into wallet cash." },
  { slug: "transactions", label: "Transactions", icon: Receipt, description: "Every purchase, funding and conversion in one place." },
  { slug: "rewards", label: "Rewards", icon: Gift, description: "Loyalty points you earn on every purchase." },
  { slug: "referrals", label: "Referrals", icon: Users, description: "Invite friends and earn when they join." },
  { slug: "weekend-rush", label: "Weekend Rush", icon: Zap, description: "Weekend-only deals and giveaways." },
  { slug: "promotions", label: "Promotions", icon: Megaphone, description: "Current offers and discounts." },
  { slug: "notifications", label: "Notifications", icon: Bell, description: "Alerts about your account and purchases." },
  { slug: "support", label: "Support", icon: LifeBuoy, description: "Get help from the Smart Browsers team." },
];

/** Shown in the mobile bottom bar; everything else lives in the "More" sheet. */
export const customerBottomNav = ["dashboard", "buy-data", "buy-airtime", "wallet"];

export const adminNav: NavItem[] = [
  { slug: "overview", label: "Overview", icon: BarChart3, description: "Platform health, revenue and activity at a glance." },
  { slug: "customers", label: "Customers", icon: UserCog, description: "Search, view and manage customer accounts." },
  { slug: "wallet-management", label: "Wallet Management", icon: Wallet, description: "Review balances, credits and debits." },
  { slug: "transactions", label: "Transactions", icon: Receipt, description: "All platform transactions and their statuses." },
  { slug: "vtu-providers", label: "VTU Provider Management", icon: Server, description: "Configure and monitor VTU service providers." },
  { slug: "payment-gateways", label: "Payment Gateway Management", icon: CreditCard, description: "Configure payment gateways for wallet funding." },
  { slug: "products-pricing", label: "Products and Pricing", icon: Tags, description: "Data plans, airtime rates and margins." },
  { slug: "welcome-bonus", label: "Welcome Bonus Settings", icon: BadgePercent, description: "Control the new-account bonus amount and rules." },
  { slug: "referral-settings", label: "Referral Settings", icon: Share2, description: "Referral rewards and eligibility rules." },
  { slug: "loyalty", label: "Loyalty Programme", icon: Crown, description: "Points, tiers and redemption rules." },
  { slug: "weekend-giveaways", label: "Weekend Giveaways", icon: PartyPopper, description: "Schedule and manage Weekend Rush giveaways." },
  { slug: "promotions", label: "Special Promotions", icon: Sparkles, description: "Create and schedule promotional campaigns." },
  { slug: "security-logs", label: "Security and Activity Logs", icon: ShieldCheck, description: "Admin actions, sign-ins and security events." },
  { slug: "reports", label: "Reports and Profit Analysis", icon: LineChart, description: "Revenue, cost and profit reporting." },
  { slug: "support-settings", label: "Support Settings", icon: Headphones, description: "Support channels, hours and contact details." },
  { slug: "platform-settings", label: "Platform Settings", icon: Settings, description: "General platform configuration." },
];

export const findNav = (items: NavItem[], slug: string) => items.find((i) => i.slug === slug);
