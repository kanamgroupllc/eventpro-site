import { cn } from "@/lib/utils";
import { STANDARD_EVENT_CATEGORIES, CULTURAL_EVENT_CATEGORIES, EVENT_FORM_CATEGORIES } from "@eventpro/shared";
import { 
  Music, Trophy, Monitor, Briefcase, Palette, UtensilsCrossed, Heart, 
  GraduationCap, Sparkles, MoreHorizontal, PartyPopper, Flag, Film, 
  Users, Church, Globe, Utensils, type LucideIcon 
} from "lucide-react";

/** Border color (and glow) per category for vibrant pills */
const CATEGORY_BORDERS: Record<string, string> = {
  Music: "border-pink-400/70 hover:border-pink-400",
  Sports: "border-emerald-400/70 hover:border-emerald-400",
  Technology: "border-cyan-400/70 hover:border-cyan-400",
  Business: "border-slate-400/70 hover:border-slate-400",
  Arts: "border-orange-400/70 hover:border-orange-400",
  "Food & Drink": "border-amber-400/70 hover:border-amber-400",
  "Health & Wellness": "border-teal-400/70 hover:border-teal-400",
  Education: "border-indigo-400/70 hover:border-indigo-400",
  Entertainment: "border-violet-400/70 hover:border-violet-400",
  "Gala & Fundraiser": "border-rose-400/70 hover:border-rose-400",
  "National Day Celebration": "border-amber-500/70 hover:border-amber-500",
  "Diaspora Film Screening": "border-fuchsia-400/70 hover:border-fuchsia-400",
  "Community Gathering": "border-sky-400/70 hover:border-sky-400",
  "Religious & Spiritual": "border-purple-400/70 hover:border-purple-400",
  "Cultural Festival": "border-lime-400/70 hover:border-lime-400",
  "Afrobeat Concert": "border-pink-400/70 hover:border-pink-400",
  "Caribbean Night": "border-yellow-400/70 hover:border-yellow-400",
  "Latin Fiesta": "border-red-400/70 hover:border-red-400",
  Other: "border-primary/60 hover:border-primary",
  Conference: "border-blue-400/70 hover:border-blue-400",
  Comedy: "border-yellow-400/70 hover:border-yellow-400",
  Theater: "border-rose-400/70 hover:border-rose-400",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Standard categories
  Music: Music,
  Sports: Trophy,
  Technology: Monitor,
  Business: Briefcase,
  Arts: Palette,
  "Food & Drink": UtensilsCrossed,
  "Health & Wellness": Heart,
  Education: GraduationCap,
  Entertainment: Sparkles,
  // Cultural taxonomy categories
  "Gala & Fundraiser": PartyPopper,
  "National Day Celebration": Flag,
  "Diaspora Film Screening": Film,
  "Community Gathering": Users,
  "Religious & Spiritual": Church,
  "Cultural Festival": Globe,
  "Afrobeat Concert": Music,
  "Caribbean Night": Music,
  "Latin Fiesta": Utensils,
  Conference: Monitor,
  Comedy: Sparkles,
  Theater: Film,
  Other: MoreHorizontal,
};

// All discovery categories (matches event creation form + DB seed)
const DISCOVERY_CATEGORIES = [...EVENT_FORM_CATEGORIES];

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  className?: string;
  showCultural?: boolean;
  /** Stitch discovery_web: rounded-2xl chips on lavender surface */
  variant?: "glass" | "editorial";
  /** Hide icons on editorial chips (cleaner pills) */
  hideIcons?: boolean;
}

export const CategoryFilter = ({
  selectedCategory,
  onCategoryChange,
  className,
  showCultural = true,
  variant = "glass",
  hideIcons = false,
}: CategoryFilterProps) => {
  const categories = showCultural
    ? DISCOVERY_CATEGORIES
    : [...STANDARD_EVENT_CATEGORIES, "Other"];

  if (variant === "editorial") {
    return (
      <div className={cn("flex flex-wrap gap-2 p-1", className)}>
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold font-headline tracking-tight transition-all hover:scale-[1.02] active:scale-[0.98]",
            selectedCategory === null
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "bg-secondary text-primary hover:bg-secondary/80"
          )}
        >
          All Events
        </button>
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category] || MoreHorizontal;
          const isSelected = selectedCategory === category;
          return (
            <button
              type="button"
              key={category}
              onClick={() => onCategoryChange(isSelected ? null : category)}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold font-headline tracking-tight transition-all hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-secondary text-primary hover:bg-secondary/80"
              )}
            >
              {!hideIcons && <Icon className="h-4 w-4 shrink-0" />}
              {category}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg border-2",
            selectedCategory === null
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 border-primary"
              : "bg-white/20 dark:bg-white/15 backdrop-blur-md border-white/30 text-foreground hover:bg-white/30 hover:shadow-md"
          )}
        >
          All Events
        </button>
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category] || MoreHorizontal;
          const isSelected = selectedCategory === category;
          const isCultural = CULTURAL_EVENT_CATEGORIES.includes(category as (typeof CULTURAL_EVENT_CATEGORIES)[number]);
          const borderClass = CATEGORY_BORDERS[category] ?? "border-primary/60 hover:border-primary";
          const glass = "bg-white/15 dark:bg-white/10 backdrop-blur-md";
          const selectedClass = "bg-primary text-primary-foreground shadow-md shadow-primary/30 border-primary";
          const unselectedClass = isCultural
            ? `bg-white/25 dark:bg-white/15 backdrop-blur-md text-foreground hover:bg-white/35 border-2 ${borderClass}`
            : `bg-white/20 dark:bg-white/15 backdrop-blur-md text-foreground hover:bg-white/30 border-2 ${borderClass}`;
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(isSelected ? null : category)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[0_0_14px_hsl(var(--primary)_/_0.25)]",
                isSelected ? selectedClass : unselectedClass
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
};
