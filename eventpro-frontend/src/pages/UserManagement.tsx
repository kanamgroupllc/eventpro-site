import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import type { User, UserRole, UserStatus } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const createAdminSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
});
type CreateAdminFormData = z.infer<typeof createAdminSchema>;

const UserManagement = () => {
  const adminApi = useAdminApi();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAdminFormData>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", phoneNumber: "" },
  });

  useEffect(() => {
    if (!adminApi) return;
    let cancelled = false;
    setLoading(true);
    adminApi
      .getUsersPage(1, 50)
      .then((page) => {
        if (!cancelled) setUsers(page.content);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Failed to load users", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminApi, toast]);

  const onCreateAdmin = async (data: CreateAdminFormData) => {
    if (!adminApi) return;
    setCreateSubmitting(true);
    try {
      const created = await adminApi.createAdminUser({
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phoneNumber: data.phoneNumber?.trim() || undefined,
      });
      setUsers((prev) => [created, ...prev]);
      reset();
      toast({ title: "Admin user created" });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast({
        title: "Failed to create admin user",
        description: message || "Email may already be in use.",
        variant: "destructive",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    if (!adminApi || user.role === newRole) return;
    if (user.id === currentUser?.id && newRole !== "ADMIN") {
      toast({ title: "You cannot change your own role", variant: "destructive" });
      return;
    }
    setUpdatingId(user.id);
    try {
      const updated = await adminApi.updateUserRole(user.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (user: User, newStatus: UserStatus) => {
    if (!adminApi || user.status === newStatus) return;
    if (user.id === currentUser?.id) {
      toast({ title: "You cannot change your own status", variant: "destructive" });
      return;
    }
    setUpdatingId(user.id);
    try {
      const updated = await adminApi.updateUserStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!adminApi) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 py-8 pb-24"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500 mb-2">Console &gt; Users</p>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">12,482 total registered users (demo scale — table shows loaded page)</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New this month</p>
            <p className="text-2xl font-bold mt-1">+1,420</p>
            <p className="text-xs text-muted-foreground mt-1">12% increase from previous period</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending approval</p>
            <p className="text-2xl font-bold mt-1">42</p>
            <p className="text-xs text-primary font-medium mt-1">Review now →</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System health</p>
            <p className="text-2xl font-bold mt-1">99.9%</p>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full w-[99%] bg-primary rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 rounded-2xl bg-muted/30 border border-border/60">
        <Input className="max-w-xs rounded-xl" placeholder="Search by name, email or ID..." />
        <select className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option>All Roles</option>
        </select>
        <select className="rounded-xl border border-input bg-background px-3 py-2 text-sm">
          <option>All Status</option>
        </select>
        <Button variant="outline" size="sm" className="rounded-xl" type="button">
          Filters
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-muted-foreground">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox />
          <span>Select all {users.length} users on this page</span>
        </label>
        <span className="font-semibold text-foreground">Bulk actions:</span>
        <button type="button" className="text-primary font-medium hover:underline">
          Change role
        </button>
        <button type="button" className="text-destructive font-medium hover:underline">
          Suspend
        </button>
        <button type="button" className="text-muted-foreground hover:underline">
          Delete
        </button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create admin user
          </CardTitle>
          <CardDescription>
            Add a new user with ADMIN role. They will be able to access the admin dashboard and APIs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onCreateAdmin)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="admin@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Min 8 characters"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-firstName">First name</Label>
              <Input
                id="create-firstName"
                placeholder="Jane"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">Last name</Label>
              <Input
                id="create-lastName"
                placeholder="Admin"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone (optional)</Label>
              <Input
                id="create-phone"
                placeholder="+1 234 567 8900"
                {...register("phoneNumber")}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createSubmitting} className="w-full">
                {createSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create admin"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-8">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const busy = updatingId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm w-full max-w-[120px]"
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user, e.target.value as UserRole)
                          }
                          disabled={isSelf || busy}
                        >
                          <option value="USER">User</option>
                          <option value="ORGANIZER">Organizer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm w-full max-w-[160px]"
                          value={user.status}
                          onChange={(e) =>
                            handleStatusChange(user, e.target.value as UserStatus)
                          }
                          disabled={isSelf || busy}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="PENDING_VERIFICATION">Pending verification</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserManagement;
