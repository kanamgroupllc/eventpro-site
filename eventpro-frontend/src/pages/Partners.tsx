import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Gift, ArrowRight, CheckCircle2, Megaphone, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";

const Partners = () => {
  const ambassadorBenefits = [
    "Help promote cultural events to your community",
    "Early access to events you help amplify",
    "Co-create promotional materials for your audience",
    "Featured spotlight opportunities on our channels",
    "Direct line to our partnership team",
  ];

  const venueBenefits = [
    "Connect with organizers looking for cultural venues",
    "Co-marketing opportunities around hosted events",
    "Streamlined ticketing for events at your space",
    "Custom venue presence on the platform (coming as we grow)",
  ];

  const referralBenefits = [
    "Introduce organizers in your network to Kanam Events",
    "We handle onboarding and platform support",
    "Rewards discussed individually based on referral impact",
  ];

  return (
    <PageShell className="bg-background">
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            Partner With Us
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Grow Together With Our{" "}
            <span className="text-primary">Partner Program</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            We are building partnerships with community voices, venues, and organizers
            across the diaspora. If that sounds like you, we would love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/contact">Talk to Partnerships</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#ambassador">Explore paths</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="ambassador" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Megaphone className="h-6 w-6 text-primary" />
                </div>
                <Badge>Community Ambassadors</Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Represent Your Community
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Are you a voice in your diaspora community? Join as an ambassador to
                help connect people with authentic cultural events.
              </p>
              <ul className="space-y-3 mb-8">
                {ambassadorBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild>
                <Link to="/contact">
                  Apply to Be an Ambassador
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Who We Are Looking For
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background/50">
                  <h4 className="font-semibold mb-2">Social Media Creators</h4>
                  <p className="text-sm text-muted-foreground">
                    Creators with engaged diaspora audiences on Instagram, TikTok, or YouTube
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <h4 className="font-semibold mb-2">Community Leaders</h4>
                  <p className="text-sm text-muted-foreground">
                    Cultural organization leads, faith leaders, and community advocates
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50">
                  <h4 className="font-semibold mb-2">Event Enthusiasts</h4>
                  <p className="text-sm text-muted-foreground">
                    People who love sharing cultural experiences with friends and family
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="venues" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Card className="order-2 lg:order-1 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-accent-foreground" />
                  Venue Types We Partner With
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Cultural Centers",
                    "Banquet Halls",
                    "Churches & Mosques",
                    "Community Centers",
                    "Restaurants",
                    "Outdoor Spaces",
                    "Hotels & Resorts",
                    "Theaters",
                  ].map((venue) => (
                    <div
                      key={venue}
                      className="p-3 rounded-lg bg-background/50 text-center text-sm font-medium"
                    >
                      {venue}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Building2 className="h-6 w-6 text-accent-foreground" />
                </div>
                <Badge variant="secondary">Venue Partners</Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Host Cultural Events At Your Space
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Connect your venue with organizers looking for the right place for
                cultural celebrations, galas, and community gatherings.
              </p>
              <ul className="space-y-3 mb-8">
                {venueBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/contact">
                  List Your Venue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="affiliate" className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <Badge>Referrals</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Refer Organizers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Know event organizers who would thrive on Kanam Events? Introduce them
              to us. Referral rewards are set case by case — we are not publishing
              fixed commission rates until the program is fully launched.
            </p>
          </div>

          <ul className="space-y-3 mb-10 max-w-xl mx-auto">
            {referralBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="text-center">
            <Button size="lg" asChild>
              <Link to="/contact">
                Start a Referral Conversation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Reach Out",
                description:
                  "Tell us about yourself, your audience, or your venue through our contact form.",
              },
              {
                step: "2",
                title: "We Follow Up",
                description:
                  "Our team reviews your note and gets back with next steps for your partnership path.",
              },
              {
                step: "3",
                title: "Build Together",
                description:
                  "We align on how to collaborate — promotion, venue hosting, or organizer referrals.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Partner With Us?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Partnerships are early-stage and handled personally. Reach out and we will
            figure out the right fit together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/contact">
                Contact Partnerships
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Partners;
