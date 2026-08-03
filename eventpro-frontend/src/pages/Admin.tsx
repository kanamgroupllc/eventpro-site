import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Key,
  ScrollText,
  UserCog,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Admin = () => {
  const { user } = useAuth();

  const adminCards = [
    {
      title: "Overview",
      description: "Platform stats: users, events, tickets, revenue",
      icon: BarChart3,
      href: "/admin/overview",
    },
    {
      title: "User Management",
      description: "Manage users, roles, permissions, create admins",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Verification (KYC)",
      description: "Review and approve or reject identity verification",
      icon: ShieldCheck,
      href: "/admin/verification",
    },
    {
      title: "Events",
      description: "View all events on the platform",
      icon: Calendar,
      href: "/admin/events",
    },
    {
      title: "Event Sales",
      description: "Tickets sold and revenue per event",
      icon: TrendingUp,
      href: "/admin/event-sales",
    },
    {
      title: "Revenue",
      description: "Revenue and tickets sold over time",
      icon: DollarSign,
      href: "/admin/revenue",
    },
    {
      title: "API Keys",
      description: "Enterprise API keys and credentials",
      icon: Key,
      href: "/admin/api-keys",
    },
    {
      title: "Audit Logs",
      description: "Administrative actions and security events",
      icon: ScrollText,
      href: "/admin/audit-logs",
    },
    {
      title: "Record offline subscription",
      description: "Record invoice/wire subscription payment (Stripe subscriptions are automatic)",
      icon: CreditCard,
      href: "/admin/subscription-payments",
    },
    {
      title: "Event reviewer permissions",
      description: "Role configuration for editorial and event approval (mock UI)",
      icon: UserCog,
      href: "/admin/event-reviewer-permissions",
    },
    {
      title: "System health",
      description: "Infrastructure status, latency, and regional overview (mock UI)",
      icon: Activity,
      href: "/admin/system-health",
    },
  ];

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Shield className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            Admin dashboard
          </h1>
          <p className="text-muted-foreground">Welcome, {user?.firstName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={card.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default Admin;
