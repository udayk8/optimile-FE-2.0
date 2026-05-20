import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "../ui/button";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
    </Button>
  );
}
