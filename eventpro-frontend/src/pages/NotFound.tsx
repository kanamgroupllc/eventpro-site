import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { Ticket } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-[0_16px_32px_rgba(10,102,240,0.28)]">
          <Ticket className="h-8 w-8 text-primary-foreground" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary/80">404</p>
        <h1 className="mt-2 text-3xl font-extrabold font-headline tracking-tight text-foreground md:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          We couldn&apos;t find a page at <span className="font-mono text-foreground/80">{location.pathname}</span>.
        </p>
        <Button asChild className="mt-8 rounded-full px-8 bg-gradient-primary shadow-[0_16px_32px_rgba(10,102,240,0.28)]">
          <Link to="/">Return home</Link>
        </Button>
      </div>
    </PageShell>
  );
};

export default NotFound;
