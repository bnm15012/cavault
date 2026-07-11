import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileStack,
  CalendarRange,
  UserCog,
  ShieldCheck,
  History,
  CreditCard,
  Landmark,
  LogOut,
  Menu,
  X,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, hasPerm } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  const firmNav: NavItem[] = [];
  if (user?.isFirmMember) {
    firmNav.push({ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
    firmNav.push({ to: "/clients", label: "Clients", icon: Users });
    firmNav.push({ to: "/requests", label: "Document Requests", icon: FolderOpen });
    firmNav.push({ to: "/templates", label: "Templates", icon: FileStack });
    firmNav.push({ to: "/financial-years", label: "Financial Years", icon: CalendarRange });
    firmNav.push({ to: "/team", label: "Team", icon: UserCog });
    if (hasPerm(user, "settings.edit")) {
      firmNav.push({ to: "/roles", label: "Roles & Permissions", icon: ShieldCheck });
    }
    firmNav.push({ to: "/activity", label: "Activity Log", icon: History });
    if (user.isCaAdmin) {
      firmNav.push({ to: "/billing", label: "Billing", icon: CreditCard });
    }
  }
  if (user?.isClient) {
    firmNav.push({ to: "/portal", label: "My Documents", icon: FileText });
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {firmNav.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarHeader = (
    <div className="flex items-center gap-2 px-6 py-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Landmark className="h-4 w-4" />
      </span>
      <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">
        PracticeVault
      </span>
    </div>
  );

  const sidebarFooter = (
    <div className="border-t border-sidebar-border px-4 py-4">
      <div className="mb-3 px-2">
        <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
          {user?.fullName || user?.email}
        </p>
        <p className="truncate text-xs text-sidebar-foreground/60">{user?.tenantName}</p>
        {user?.isClient && (
          <Badge variant="outline" className="mt-1 border-sidebar-border text-sidebar-foreground/70">
            Client portal
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        {sidebarHeader}
        {nav}
        {sidebarFooter}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-semibold text-sidebar-accent-foreground">
            PracticeVault
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-20 flex flex-col bg-sidebar pt-16 lg:hidden">
          {nav}
          {sidebarFooter}
        </div>
      )}

      <main className="flex-1 pt-14 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
