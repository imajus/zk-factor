import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Copy,
  LogOut,
  Menu,
  X,
  Zap,
  Wallet,
  Building2,
  Briefcase,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { ALEO_EXPLORER } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchFactorStatus } from "@/lib/aleo-factors";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Transactions", href: "/transactions" },
  { label: "Settings", href: "/settings" },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const {
    isConnected,
    address,
    disconnect,
    formatAddress,
    network,
    activeRole,
    setActiveRole,
  } = useWallet();

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const handleSwitchToCreditor = () => {
    setActiveRole("business");
    navigate("/dashboard");
  };

  const handleSwitchToFactor = async () => {
    if (!address) return;
    setSwitchingRole(true);
    try {
      const status = await fetchFactorStatus(address);
      if (status?.is_active) {
        setActiveRole("factor");
        navigate("/dashboard");
      } else {
        navigate("/register-factor");
      }
    } catch {
      navigate("/register-factor");
    } finally {
      setSwitchingRole(false);
    }
  };

  const roleLabel = activeRole === "factor" ? "Factor" : activeRole === "business" ? "Creditor" : null;
  const RoleIcon = activeRole === "factor" ? Briefcase : Building2;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">ZK Factor</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {isConnected &&
            navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              {/* Network Badge */}
              <Badge
                variant="outline"
                className="hidden sm:flex gap-1 items-center"
              >
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {network === "mainnet" ? "Mainnet" : "Testnet"}
              </Badge>

              {/* Role Switcher Badge */}
              {roleLabel && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="hidden sm:flex gap-1.5 items-center h-7 px-2 text-xs"
                      disabled={switchingRole}
                    >
                      {switchingRole ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RoleIcon className="h-3 w-3" />
                      )}
                      {switchingRole ? "Checking…" : roleLabel}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Switch role
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSwitchToCreditor}
                      disabled={activeRole === "business"}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      Creditor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSwitchToFactor}
                      disabled={activeRole === "factor" || switchingRole}
                      className="gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      Factor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Wallet Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {formatAddress(address || "")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">Connected Wallet</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatAddress(address || "", 8)}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={copyAddress}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Address
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`${ALEO_EXPLORER}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={disconnect}
                    className="text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && isConnected && (
        <div className="md:hidden border-t border-border">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
            {/* Mobile role switcher */}
            {roleLabel && (
              <>
                <div className="px-3 pt-2 pb-1 text-xs text-muted-foreground font-medium">
                  Switch role
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSwitchToCreditor();
                  }}
                  disabled={activeRole === "business"}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left",
                    activeRole === "business"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Creditor
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSwitchToFactor();
                  }}
                  disabled={activeRole === "factor" || switchingRole}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left",
                    activeRole === "factor"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {switchingRole ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Briefcase className="h-4 w-4" />
                  )}
                  {switchingRole ? "Checking…" : "Factor"}
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
