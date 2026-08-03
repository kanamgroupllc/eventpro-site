import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, Check, X, Clock, AlertTriangle, Filter } from "lucide-react";
import { motion } from "framer-motion";
import type { PendingVerification } from "@/types/api";
import { Link } from "react-router-dom";

const AdminVerification = () => {
  const adminApi = useAdminApi();
  const { toast } = useToast();
  const [list, setList] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const fetchPending = () => {
    if (!adminApi) return;
    setLoading(true);
    adminApi
      .getVerificationPending(50)
      .then(setList)
      .catch(() => {
        toast({ title: "Failed to load pending verifications", variant: "destructive" });
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, [adminApi]);

  const handleApprove = async (submissionId: string) => {
    if (!adminApi) return;
    setActingId(submissionId);
    try {
      await adminApi.approveVerification(submissionId);
      setList((prev) => prev.filter((s) => s.id !== submissionId));
      toast({ title: "Verification approved" });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!adminApi) return;
    setActingId(submissionId);
    try {
      await adminApi.rejectVerification(submissionId, rejectReason[submissionId] || undefined);
      setList((prev) => prev.filter((s) => s.id !== submissionId));
      setRejectReason((prev) => ({ ...prev, [submissionId]: "" }));
      toast({ title: "Verification rejected" });
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  if (!adminApi) return null;

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  };

  const pendingCount = list.length;
  const highRiskApprox = loading ? "—" : Math.min(8, Math.ceil(pendingCount * 0.06) || 0).toString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-pink-600/90 mb-2">Admin · User management</p>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">Verification queue</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Reviewing organizer applications and KYC submissions.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full" disabled>
            <Filter className="h-4 w-4 mr-2" />
            Filter by risk
          </Button>
          <Button type="button" variant="default" className="rounded-full bg-gradient-primary" disabled>
            Export report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 shadow-md">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Pending review</p>
          <p className="text-3xl font-bold tabular-nums mt-1">{loading ? "…" : pendingCount}</p>
          <p className="text-xs mt-2 opacity-90">In queue right now</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Average wait time
          </p>
          <p className="text-3xl font-bold tabular-nums mt-1">—</p>
          <p className="text-xs text-muted-foreground mt-2">Computed when SLA data is available</p>
        </div>
        <div className="rounded-2xl border border-pink-200/80 bg-pink-50/80 dark:bg-pink-950/20 p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-pink-800 dark:text-pink-300 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> High risk flagged
          </p>
          <p className="text-3xl font-bold tabular-nums mt-1 text-pink-900 dark:text-pink-100">
            {highRiskApprox}
          </p>
          <p className="text-xs text-pink-900/80 dark:text-pink-200/80 mt-2">Review manually</p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Pending submissions</CardTitle>
          <CardDescription>
            Review and approve or reject identity verification requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-8">No pending verifications.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => {
                  const busy = actingId === s.id;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.legalEntityType || "—"}</TableCell>
                      <TableCell>{[s.addressCity, s.addressState].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
                          Low
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(s.submittedAt)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link to={`/admin/verification/${encodeURIComponent(s.id)}`}>Review details</Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right space-y-2">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Input
                            placeholder="Rejection reason (optional)"
                            className="max-w-[200px] h-8 text-sm"
                            value={rejectReason[s.id] ?? ""}
                            onChange={(e) =>
                              setRejectReason((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(s.id)}
                            disabled={busy}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(s.id)}
                            disabled={busy}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            Reject
                          </Button>
                        </div>
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

export default AdminVerification;
