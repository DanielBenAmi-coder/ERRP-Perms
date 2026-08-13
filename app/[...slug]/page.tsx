import { Portal, type View } from "../portal";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPayload } from "../../lib/discord";
import { isHigherStaff } from "../../lib/domain";

const routes: Record<string, View> = {
  login: "login", dashboard: "dashboard", "permission-reports/new": "new", "permission-reports": "reports",
  notifications: "notifications", management: "management", "management/review-queue": "queue",
  "management/no-evidence": "no-evidence", "management/permission-reports": "all", "management/staff": "staff",
  "management/reconciliation": "reconciliation",
  "management/analytics": "analytics", "management/audit-logs": "audit", "management/settings": "settings",
};

export default async function RoutedPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join("/");
  const secret = process.env.AUTH_SECRET;
  const session = secret ? await verifyPayload((await cookies()).get("er_session")?.value, secret) : null;
  if (path !== "login" && !session) redirect("/login");
  if (path === "login" && session) redirect(isHigherStaff(session.rank) ? "/management" : "/dashboard");
  if (path.startsWith("management") && (!session || !isHigherStaff(session.rank))) redirect("/dashboard");
  const view: View = routes[path] ?? (path.startsWith("permission-reports/") ? "detail" : path.startsWith("management/staff/") ? "staff-profile" : path.startsWith("management/reconciliation/imports/") ? "reconciliation-import" : path.startsWith("management/reconciliation/usage/") ? "reconciliation-usage" : "dashboard");
  return <Portal view={view}/>;
}
