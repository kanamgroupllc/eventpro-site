import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { apiService } from "@/lib/api";
import type { CulturalInterest, OrganizerInsights } from "@/types/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import * as Recharts from "recharts";

const tileBase =
  "rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px] p-5 transition-all duration-300";

const DONUT_COLORS = ["hsl(var(--primary))", "hsl(var(--primary) / 0.8)", "hsl(var(--primary) / 0.6)", "#a855f7", "#c084fc"];

export function OrganizerInsightsSection() {
  const [insights, setInsights] = useState<OrganizerInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      const data = await apiService.getOrganizerInsights();
      setInsights(data);
    } catch {
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const chartData = (insights?.topCulturalInterests ?? []).map((c, i) => ({
    name: c.name,
    count: c.count,
    fill: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const chartConfig = chartData.reduce(
    (acc, d) => ({ ...acc, [d.name]: { label: d.name } }),
    {} as Record<string, { label: string }>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_16px_rgba(147,51,234,0.3)]">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          AI Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insight card */}
        <div className={`${tileBase} ring-1 ring-primary/10 shadow-[0_0_20px_rgba(147,51,234,0.15)]`}>
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            AI Insight
          </h3>
          {loading ? (
            <Skeleton className="h-16 w-full bg-white/10" />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insights?.aiInsight ?? "Create and publish events to see AI-powered tips here."}
            </p>
          )}
        </div>

        {/* Top Cultural Interests donut */}
        <div className={tileBase}>
          <h3 className="font-semibold mb-4">Top Cultural Interests</h3>
          {loading ? (
            <Skeleton className="h-40 w-full rounded-lg bg-white/10" />
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendee data yet. Sales will populate this by category.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <Recharts.PieChart>
                <Recharts.Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Recharts.Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Recharts.Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </Recharts.PieChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </section>
  );
}
