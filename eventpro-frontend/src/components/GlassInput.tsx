import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface GlassInputProps extends Omit<React.ComponentProps<"input">, "placeholder"> {
  label: string;
  /** When true, show a small green checkmark with a quick flash. */
  showValid?: boolean;
  error?: string;
  containerClassName?: string;
  /** Placeholder when field is empty (floating label shows as placeholder when inactive). */
  placeholder?: string;
}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      label,
      showValid = false,
      error,
      containerClassName,
      className,
      id: idProp,
      placeholder,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value && props.value !== "");
    const id = idProp ?? React.useId();
    const isActive = focused || hasValue;

    React.useEffect(() => {
      setHasValue(!!props.value && String(props.value).trim() !== "");
    }, [props.value]);

    return (
      <div className={cn("relative", containerClassName)}>
        <div
          className={cn(
            "relative rounded-xl border bg-transparent transition-all duration-200",
            "border-white/20 min-h-[52px]",
            "focus-within:border-primary focus-within:shadow-[0_0_0_1px_hsl(var(--primary)),0_0_20px_rgba(147,51,234,0.35)]",
            error && "border-destructive focus-within:border-destructive focus-within:shadow-[0_0_0_1px_hsl(var(--destructive)),0_0_12px_rgba(239,68,68,0.2)]"
          )}
        >
          <input
            ref={ref}
            id={id}
            className={cn(
              "w-full bg-transparent pt-5 pb-2 px-4 text-foreground placeholder:text-transparent",
              "focus:outline-none text-sm md:text-base",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            placeholder={placeholder ?? label}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            onChange={(e) => {
              setHasValue(!!e.target.value.trim());
              props.onChange?.(e);
            }}
            {...props}
          />
          <label
            htmlFor={id}
            className={cn(
              "absolute left-4 transition-all duration-200 pointer-events-none text-muted-foreground",
              isActive
                ? "top-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary"
                : "top-1/2 -translate-y-1/2 text-sm"
            )}
          >
            {label}
          </label>
          <AnimatePresence>
            {showValid && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1.5 px-1">{error}</p>
        )}
      </div>
    );
  }
);
GlassInput.displayName = "GlassInput";

export { GlassInput };
