import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "icon" | "full";
  className?: string;
}

export const LanguageSwitcher = ({ variant = "icon", className }: LanguageSwitcherProps) => {
  const { language, setLanguage, languages } = useLanguage();

  const currentLanguage = languages.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={variant === "icon" ? "icon" : "default"} className={className}>
          {variant === "icon" ? (
            <Globe className="h-5 w-5" />
          ) : (
            <span className="flex items-center gap-2">
              <span>{currentLanguage?.flag}</span>
              <span>{currentLanguage?.nativeName}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              language === lang.code && "bg-primary/10"
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <div className="flex flex-col">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </div>
            {language === lang.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
