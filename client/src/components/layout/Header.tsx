import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Wallet, 
  Bell, 
  ChevronDown, 
  RefreshCw, 
  ExternalLink, 
  Copy,
  LogOut,
  HelpCircle,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Invoices', href: '/invoices', businessOnly: true },
  { label: 'Portfolio', href: '/portfolio', factorOnly: true },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Settings', href: '/settings' },
];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    isConnected,
    address,
    balance,
    roles,
    activeRole,
    setActiveRole,
    connect,
    disconnect,
    formatAddress,
    isSyncing,
    syncWallet,
    lastSyncTime,
    network,
  } = useWallet();

  const filteredNavItems = navItems.filter(item => {
    if (item.businessOnly) return activeRole === 'business';
    if (item.factorOnly) return activeRole === 'factor';
    return true;
  });

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

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
          {isConnected && filteredNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                location.pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
              <Badge variant="outline" className="hidden sm:flex gap-1 items-center">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </Badge>

              {/* Role Switcher */}
              {roles.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      {activeRole === 'business' ? 'Business' : 'Factor'}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {roles.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => setActiveRole(role)}
                        className={cn(activeRole === role && 'bg-primary/10')}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Sync Status */}
              <Button
                variant="ghost"
                size="icon"
                onClick={syncWallet}
                disabled={isSyncing}
                className="relative"
              >
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                {lastSyncTime && !isSyncing && (
                  <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  3
                </span>
              </Button>

              {/* Wallet Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">{formatAddress(address || '')}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">Connected Wallet</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatAddress(address || '', 8)}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <div className="text-xs text-muted-foreground mb-1">Balance</div>
                    <div className="text-lg font-semibold">
                      {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={copyAddress}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Address
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Explorer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={syncWallet}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={disconnect} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isConnected && (
            <Button onClick={connect} className="gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}

          {/* Help */}
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && isConnected && (
        <div className="md:hidden border-t border-border">
          <nav className="container py-4 flex flex-col gap-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
