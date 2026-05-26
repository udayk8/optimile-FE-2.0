export const MODULE_CODE_TO_KEY: Record<string, string> = {
  BK001: "TMS",
  AMS01: "AMS",
  FLT01: "FLEET",
  FIN01: "FINANCE",
};

export const hierarchyLabelSuggestions = [
  "Region",
  "Country",
  "Branch",
  "Factory",
  "Hub",
] as const;
