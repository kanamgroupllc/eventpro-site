import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { Ticket } from "lucide-react";
import { motion } from "framer-motion";
import { AuthPageLayout } from "@/components/AuthPageLayout";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (_data: ResetFormData) => {
    setIsLoading(true);
    try {
      // No POST in api.ts yet — same as mobile placeholder; keeps validation + UX ready for backend.
      await new Promise((r) => setTimeout(r, 600));
      toast({
        title: "Password reset not connected",
        description:
          "The server endpoint for resetting your password is not wired yet. Use support or try again after your backend exposes reset-password.",
      });
      navigate("/login", { replace: true });
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-[0_20px_40px_rgba(10,10,10,0.08)]">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-[0_12px_28px_rgba(10,102,240,0.25)]">
              <Ticket className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-extrabold font-headline tracking-tight">Reset password</CardTitle>
            <CardDescription className="text-base">
              {token
                ? "Choose a new password for your account."
                : "Open the link from your reset email (it includes a token), or request a new link below."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {token ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <PasswordInput id="password" placeholder="Create a password" {...register("password")} />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-full bg-gradient-primary shadow-[0_16px_32px_rgba(10,102,240,0.28)] h-12 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving…" : "Update password"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center text-sm text-muted-foreground">
                <p>
                  Password reset from email uses a secure link with a token. If you don&apos;t have one, we can send a
                  new link from the forgot-password page.
                </p>
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link to="/forgot-password">Request reset link</Link>
                </Button>
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link to="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AuthPageLayout>
  );
};

export default ResetPassword;
