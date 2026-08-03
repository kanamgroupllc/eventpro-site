import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, Bell, Mail, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";

const Privacy = () => {
  return (
    <PageShell>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          <div className="text-center">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center mb-4">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold font-headline tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg">
              How we collect, use, and protect your data. Your choices matter.
            </p>
          </div>

          {/* Your choices – opt out and preferences */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Your choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You can control how we communicate with you and use your data:
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full justify-between" asChild>
                  <Link to="/settings#notifications">
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notification preferences
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <Link to="/settings#notifications">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Opt out of marketing emails
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-between" asChild>
                  <Link to="/contact">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Request data export or deletion
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Policy content */}
          <Card>
            <CardHeader>
              <CardTitle>Information we collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We collect information you provide when you create an account (name, email, phone), purchase tickets (payment and order details), or organize events (event details, attendee data for your events). We also collect usage data (e.g. pages visited, device type) to improve the service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How we use your information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We use your information to provide the ticketing and event management service, process payments, send order and event-related notifications (e.g. confirmations, reminders), and, with your consent, marketing and tips. We do not sell your personal information to third parties. Organizers retain ownership of their attendee data and may export it in line with our Terms of Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cookies and similar technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We use cookies and similar technologies for authentication, session management, and analytics. You can control cookies through your browser settings. Essential cookies are required for the service to function.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your rights (CCPA / GDPR-style)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Depending on where you live, you may have the right to access your data, correct it, request deletion, or data portability. You may also opt out of marketing and certain other uses. Use the links above to manage notification preferences and opt out of marketing, or contact us to request access, deletion, or export of your data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                For privacy requests or questions, contact us at{" "}
                <a href="mailto:support@kanamevents.com" className="text-primary hover:underline">
                  support@kanamevents.com
                </a>{" "}
                or use our{" "}
                <Link to="/contact" className="text-primary hover:underline">
                  Contact page
                </Link>.
              </p>
              <Button asChild variant="outline">
                <Link to="/contact">Contact us</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default Privacy;
