import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { Shield, Pencil, Users } from "lucide-react";

/**
 * Stitch-style Roles & Permissions (placeholder matrix; wire to RBAC when available).
 */
const AdminRolesPermissions = () => {
  const modules = [
    { name: "Event Management", v: true, c: true, e: true, d: false },
    { name: "Financial Reports", v: true, c: false, e: false, d: false },
    { name: "User Management", v: true, c: false, e: false, d: false },
    { name: "System Config", v: false, c: false, e: false, d: false },
  ];

  return (
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500 mb-2">Admin / User management</p>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold font-headline">Roles & Permissions</h1>
              <p className="text-muted-foreground mt-1">Define platform access levels and security protocols.</p>
            </div>
            <Button className="rounded-2xl gap-2">
              <Shield className="h-4 w-4" />
              Create New Role
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              {
                title: "Super Admin",
                tag: "System default",
                desc: "Unrestricted access to all platform modules, financial data, and system settings.",
                users: 4,
              },
              {
                title: "Event Manager",
                tag: "Operational",
                desc: "Create, edit, and publish events. Manage ticket tiers and promotional codes.",
                users: 12,
              },
              {
                title: "Support Lead",
                tag: "Customer care",
                desc: "Access to user profiles, transaction history, and refund processing tools.",
                users: 8,
              },
            ].map((r) => (
              <Card key={r.title} className="rounded-3xl border-border/60">
                <CardContent className="p-6">
                  <Badge variant="secondary" className="mb-3 rounded-full">
                    {r.tag}
                  </Badge>
                  <h2 className="text-lg font-bold mb-2">{r.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{r.desc}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{r.users} assigned</span>
                  </div>
                  <button type="button" className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline">
                    <Pencil className="h-3 w-3" />
                    Edit permissions
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl border-border/60 mb-8">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold">Permission Matrix: Event Manager</h2>
                  <Badge className="mt-2 rounded-full">Editing mode</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl">
                    Discard
                  </Button>
                  <Button className="rounded-xl">Save Role Changes</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="py-3 pr-4">Module</th>
                      <th className="py-3 px-2">View</th>
                      <th className="py-3 px-2">Create</th>
                      <th className="py-3 px-2">Edit</th>
                      <th className="py-3 px-2">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((m) => (
                      <tr key={m.name} className="border-b border-border/40">
                        <td className="py-3 font-medium">{m.name}</td>
                        <td className="py-3 px-2">
                          <Checkbox checked={m.v} disabled />
                        </td>
                        <td className="py-3 px-2">
                          <Checkbox checked={m.c} disabled />
                        </td>
                        <td className="py-3 px-2">
                          <Checkbox checked={m.e} disabled />
                        </td>
                        <td className="py-3 px-2">
                          <Checkbox checked={m.d} disabled />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-border/60">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Recent activity</h3>
                <ul className="text-sm text-muted-foreground space-y-3">
                  <li>Anya Petrova updated permissions for Support Specialist — 2h ago</li>
                  <li>Felix Chen created a new role: Regional Host — Yesterday</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-0 bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <p className="font-semibold mb-2">Security health</p>
                <p className="text-sm opacity-90 mb-4">
                  4 roles have administrative privileges. We recommend a monthly audit of these access levels.
                </p>
                <Button variant="secondary" className="rounded-xl w-full bg-background text-foreground">
                  Run full security audit
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
  );
};

export default AdminRolesPermissions;
