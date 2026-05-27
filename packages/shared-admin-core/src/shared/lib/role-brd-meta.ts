export function getRoleBrdMeta(roleName: string) {
  const name = roleName.trim().toLowerCase();

  switch (name) {
    case "tenant admin / ceo":
    case "tenant admin":
    case "ceo / executive":
      return {
        short:
          "Tenant governance, configuration, executive visibility, approvals, profitability, and full operational oversight.",
        places: "Typical scope: all tenant places.",
      };
    case "system coordinator":
      return {
        short:
          "Cross-module operational support, admin coordination, and reporting visibility.",
        places: "Typical scope: all tenant places.",
      };
    case "operations head / coo":
      return {
        short:
          "Overall operations control, escalations, SLA monitoring, and critical approvals.",
        places: "Typical scope: all tenant places.",
      };
    case "regional manager":
      return {
        short:
          "Regional operational control, rate/LR approvals, and issue handling for assigned regions.",
        places: "Typical scope: assigned regions only.",
      };
    case "operations manager":
      return {
        short:
          "Main booking execution owner for create booking, assignment coordination, shipment progress, and LR request/consumption.",
        places: "Typical scope: assigned branches or operating regions.",
      };
    case "dispatch supervisor":
      return {
        short:
          "Live dispatch execution, vehicle placement, loading coordination, and LR consumption/request support.",
        places: "Typical scope: assigned branches or dispatch locations.",
      };
    case "ground supervisor":
      return {
        short:
          "Field execution role for loading, unloading, POD/document follow-up, and on-ground exceptions.",
        places: "Typical scope: own assigned operational places or trips.",
      };
    default:
      return {
        short: "BRD summary not configured for this role yet.",
        places: "Typical scope: depends on role hierarchy mapping.",
      };
  }
}

export function getRoleBrdHoverText(roleName: string) {
  const meta = getRoleBrdMeta(roleName);
  return `${roleName}: ${meta.short} ${meta.places}`;
}
