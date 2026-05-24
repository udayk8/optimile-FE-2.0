// Verifies the redesigned Role Permissions page.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "scripts/.out/role-permissions.png";
mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();

page.on("pageerror", (error) => console.error("[pageerror]", error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[console.error]", msg.text());
});

await page.addInitScript(() => {
  const tenant = {
    id: "tenant-nippon01",
    name: "Nippon",
    code: "NIPPON01",
    region: "India",
    industry: "Logistics",
    planId: "plan-growth",
    status: "active",
    tenantType: "DIRECT_CUSTOMER",
    customerPortalEnabled: false,
    assignmentMode: "AUTO_VENDOR_FLOW",
    commercialMode: "SIMPLE",
    enabledModuleCodes: ["TMS"],
    initialHierarchyTemplate: "region-zone",
    primaryAdminUserId: "user-nippon01-admin",
    createdAt: new Date().toISOString(),
    health: { activeUsers: 1, monthlyBookings: 0, policyCount: 0, auditEvents24h: 0 },
  };
  localStorage.setItem("optimile.platform.tenants", JSON.stringify([tenant]));

  const tenantAdmin = {
    id: "role-tenant-tenant-nippon01-tenant-admin",
    tenantId: "tenant-nippon01",
    name: "Tenant Admin",
    description: "System owner",
    hierarchyLevelId: "level-nippon01-1",
    moduleCodes: ["ADMIN", "TMS"],
    dataScope: "ALL_TENANT",
    active: true,
  };
  const dispatch = {
    id: "role-tenant-nippon01-dispatch-supervisor",
    tenantId: "tenant-nippon01",
    name: "Dispatch_Supervisor",
    description: "Operational dispatch supervisor",
    hierarchyLevelId: "level-nippon01-1",
    moduleCodes: ["TMS"],
    dataScope: "OWN_RECORDS",
    active: true,
  };
  localStorage.setItem("optimile.tenant.roles", JSON.stringify([tenantAdmin, dispatch]));

  const adminUser = {
    id: "user-nippon01-admin",
    tenantId: "tenant-nippon01",
    name: "Madhesa",
    email: "admin@nippon.com",
    userType: "INTERNAL",
    roleId: tenantAdmin.id,
    orgUnitIds: [],
    linkedVendorId: null, linkedCustomerId: null, linkedDriverId: null,
    driverName: "", driverCode: "",
    status: "active",
    lastActive: new Date().toISOString(),
    password: "Admin@123",
  };
  localStorage.setItem("optimile.tenant.users", JSON.stringify([adminUser]));

  // Seed Dispatch_Supervisor with Booking Operations partial permissions.
  localStorage.setItem("optimile.tenant.rolePermissionMatrix", JSON.stringify({
    [dispatch.id]: {
      TMS: {
        BOOKING_DASHBOARD: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        BOOKING_ASSIGNMENT: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
      },
    },
  }));
});

await page.goto("http://127.0.0.1:3000/login");
await page.waitForLoadState("networkidle");
await page.getByText(/ceo@uday\.ts\.com/i).first().click({ timeout: 5000 });
await page.locator('input[type="password"]').first().fill("testing");
await page.getByRole("button", { name: /^Sign in$/i }).click();
await page.waitForLoadState("networkidle");

const tenantId = "tenant-nippon01";
await page.goto(`http://127.0.0.1:3000/platform-admin/tenant-login?tenantId=${tenantId}`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: /^Login$/ }).click();
await page.waitForURL(`**/platform-admin/tenant/${tenantId}/dashboard`, { timeout: 8000 }).catch(() => {});
await page.waitForLoadState("networkidle").catch(() => {});

await page.goto(`http://127.0.0.1:3000/platform-admin/tenant/${tenantId}/role-permissions`);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(500);

// Select the Dispatch_Supervisor role to demonstrate partial permissions.
await page.locator("select").first().selectOption({ label: "Dispatch_Supervisor" }).catch(() => {});
await page.waitForTimeout(300);

const body = ((await page.locator("main").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
console.log("BODY:", body.slice(0, 400));

await page.screenshot({ path: OUT, fullPage: true });
console.log("SCREENSHOT:", OUT);

await browser.close();
