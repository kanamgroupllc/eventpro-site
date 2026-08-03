import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Ticket } from "lucide-react";
import { AuthPageLayout } from "@/components/AuthPageLayout";

const Verify = () => {
  return (
    <AuthPageLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-[0_20px_40px_rgba(10,10,10,0.08)]">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-[0_12px_28px_rgba(10,102,240,0.25)]">
              <Ticket className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-extrabold font-headline tracking-tight">Verify your email</CardTitle>
            <CardDescription className="text-base">
              Check your inbox for a verification link to complete your registration. You can close this tab after you
              verify.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full rounded-full bg-gradient-primary shadow-[0_16px_32px_rgba(10,102,240,0.28)] h-12 text-base font-semibold">
              <Link to="/login" replace>
                Back to sign in
              </Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Wrong email?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Create a different account
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AuthPageLayout>
  );
};

export default Verify;
