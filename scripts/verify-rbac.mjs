// Drives the tenant-admin login as Guru and screenshots the dashboard so we
// can verify the Administration sidebar group is hidden for non-admin roles.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = "scripts/.out/dispatch-supervisor-dashboard.png";
mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("pageerror", (error) => console.error("[pageerror]", error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.error("[console.error]", msg.text());
});

// Seed the demo data we need: tenant, role, user, permission matrix.
await page.addInitScript(() => {
  // Tenant
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

  // Roles: a system tenant-admin + a Dispatch_Supervisor role
  const tenantAdminRole = {
    id: "role-tenant-tenant-nippon01-tenant-admin",
    tenantId: "tenant-nippon01",
    name: "Tenant Admin",
    description: "System owner",
    hierarchyLevelId: "level-nippon01-1",
    moduleCodes: ["TMS"],
    dataScope: "ALL_TENANT",
    active: true,
  };
  const dispatchRole = {
    id: "role-tenant-nippon01-dispatch-supervisor",
    tenantId: "tenant-nippon01",
    name: "Dispatch_Supervisor",
    description: "Operational dispatch supervisor",
    hierarchyLevelId: "level-nippon01-1",
    moduleCodes: ["TMS"],
    dataScope: "OWN_RECORDS",
    active: true,
  };
  localStorage.setItem("optimile.tenant.roles", JSON.stringify([tenantAdminRole, dispatchRole]));

  // Users: the tenant admin + Guru
  const adminUser = {
    id: "user-nippon01-admin",
    tenantId: "tenant-nippon01",
    name: "Madhesa",
    email: "admin@nippon.com",
    userType: "INTERNAL",
    roleId: tenantAdminRole.id,
    orgUnitIds: [],
    linkedVendorId: null,
    linkedCustomerId: null,
    linkedDriverId: null,
    driverName: "",
    driverCode: "",
    status: "active",
    lastActive: new Date().toISOString(),
    password: "Admin@123",
  };
  const guruUser = {
    id: "user-nippon01-guru",
    tenantId: "tenant-nippon01",
    name: "Guru",
    email: "guru@gmail.com",
    userType: "INTERNAL",
    roleId: dispatchRole.id,
    orgUnitIds: [],
    linkedVendorId: null,
    linkedCustomerId: null,
    linkedDriverId: null,
    driverName: "",
    driverCode: "",
    status: "active",
    lastActive: new Date().toISOString(),
    password: "Guru@123",
  };
  localStorage.setItem("optimile.tenant.users", JSON.stringify([adminUser, guruUser]));

  // Permission matrix: Dispatch_Supervisor only sees Booking Operations features.
  const matrix = {
    [dispatchRole.id]: {
      TMS: {
        BOOKING_DASHBOARD: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        BOOKING_ASSIGNMENT: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        SHIPMENT_DOCUMENTS: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        POD: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      },
    },
  };
  localStorage.setItem("optimile.tenant.rolePermissionMatrix", JSON.stringify(matrix));
});

const tenantId = "tenant-nippon01";

// Step 1: log in via the host /login demo account (CEO has all access).
await page.goto("http://127.0.0.1:3000/login");
await page.waitForLoadState("networkidle");
await page.getByText(/ceo@uday\.ts\.com/i).first().click({ timeout: 5000 });
// Demo account selection should fill email; password placeholder is "testing".
const pwd = page.locator('input[type="password"]').first();
await pwd.fill("testing");
await page.getByRole("button", { name: /^Sign in$/i }).click();
await page.waitForLoadState("networkidle");

// Step 2: go to tenant login.
await page.goto(`http://127.0.0.1:3000/platform-admin/tenant-login?tenantId=${tenantId}`);
await page.waitForLoadState("networkidle");
console.log("URL after tenant-login navigate:", page.url());
console.log("BODY_SAMPLE:", ((await page.locator("body").textContent()) ?? "").replace(/\s+/g, " ").slice(0, 400));

// Find Guru's pick row (a button containing the email) and click it.
await page.locator('button:has-text("guru@gmail.com")').first().click({ timeout: 5000 });
// Wait for state effect to propagate to the form.
await page.waitForFunction(
  () => (document.querySelector('input[type="email"]'))?.value === "guru@gmail.com",
  { timeout: 5000 },
);

const emailValue = await page.locator('input[type="email"]').first().inputValue();
const passwordValue = await page.locator('input[type="password"]').first().inputValue();
console.log("AUTOFILLED:", emailValue, "·", passwordValue.replace(/./g, "*"));

await page.getByRole("button", { name: /^Login$/ }).click();

const ok = await page.waitForURL(`**/platform-admin/tenant/${tenantId}/dashboard`, { timeout: 8000 }).then(() => true).catch(() => false);
console.log("Reached dashboard:", ok, "url=", page.url());
await page.waitForLoadState("networkidle").catch(() => {});

// Expand the sidebar (it persists collapsed by default), then dump its content.
await page.waitForSelector("aside", { state: "visible", timeout: 5000 }).catch(() => {});
await page.locator("aside").first().hover().catch(() => {});
await page.waitForTimeout(300);

// Click each top-level expandable group to reveal its children, then dump the
// full nav.
for (const groupLabel of ["Booking Setup", "Booking Operations", "Enabled Modules", "Administration"]) {
  const handle = page.locator("aside").locator(`button:has-text("${groupLabel}")`).first();
  if (await handle.count()) {
    await handle.click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

const sidebarHtml = (await page.locator("aside").first().innerText()).replace(/\s+/g, " ").trim();
console.log("SIDEBAR_TEXT:", sidebarHtml);

const labels = await page.locator("aside button, aside a").allInnerTexts();
console.log("NAV_LABELS:", JSON.stringify(labels.map((label) => label.replace(/\s+/g, " ").trim()).filter(Boolean)));

await page.screenshot({ path: OUT, fullPage: true });
console.log("SCREENSHOT:", OUT);

// Dump main page H1 + header to confirm dashboard title.
const h1 = ((await page.locator("h1").first().textContent()) ?? "").trim();
console.log("PAGE_H1:", h1);

// Dump top-right header text (workspace shell header).
const headerText = ((await page.locator("header").first().textContent()) ?? "").replace(/\s+/g, " ").trim();
console.log("HEADER:", headerText);

await browser.close();
