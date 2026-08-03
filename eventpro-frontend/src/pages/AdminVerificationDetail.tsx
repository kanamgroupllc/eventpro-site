import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";

/**
 * Stitch-style verification review detail (illustrative; load submission by ID when API supports it).
 */
const AdminVerificationDetail = () => {
  const { id } = useParams();

  return (
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin/verification" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin panel · Identity verification</p>
            <h1 className="text-2xl font-bold font-headline">Review detail</h1>
            <p className="text-sm text-muted-foreground">Submission {id ?? "—"}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="hidden sm:flex w-56 shrink-0 flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Shield className="h-5 w-5" />
              Admin Panel
            </div>
            <p className="text-xs text-muted-foreground">Identity verification</p>
            <div className="mt-4 space-y-1 text-sm">
              <span className="block py-2 px-2 rounded-lg text-muted-foreground">Dashboard</span>
              <span className="block py-2 px-2 rounded-lg bg-primary/10 text-primary font-medium">Pending reviews</span>
              <span className="block py-2 px-2 rounded-lg text-muted-foreground">Verified organizers</span>
            </div>
            <div className="mt-auto pt-4 border-t border-border/60 text-xs">
              <p className="font-semibold">Alex Rivera</p>
              <p className="text-muted-foreground">Senior Auditor</p>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <Card className="rounded-3xl border-border/60">
              <CardContent className="p-6">
                <h2 className="font-semibold mb-2">Applicant</h2>
                <p className="text-muted-foreground text-sm">Organizer application — documents below are illustrative.</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-border/60">
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Identity</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="aspect-[3/2] rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                    ID document front
                  </div>
                  <div className="aspect-[3/2] rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                    ID document back
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="rounded-2xl">
                Reject
              </Button>
              <Button className="rounded-2xl">Approve</Button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AdminVerificationDetail;
