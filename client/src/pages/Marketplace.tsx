import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Star,
  CheckCircle2,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Building2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressDisplay } from '@/components/ui/address-display';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { mockFactors, formatAleo } from '@/lib/mock-data';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

const specializations = [
  'Manufacturing',
  'Services',
  'Construction',
  'Healthcare',
  'Technology',
  'Retail',
];

const sortOptions = [
  { value: 'rate', label: 'Best Advance Rate' },
  { value: 'fees', label: 'Lowest Fees' },
  { value: 'volume', label: 'Most Volume' },
  { value: 'speed', label: 'Fastest Processing' },
];

export default function Marketplace() {
  const { activeRole } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [advanceRateRange, setAdvanceRateRange] = useState([50, 99]);
  const [minInvoiceAmount, setMinInvoiceAmount] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('rate');
  const [selectedFactor, setSelectedFactor] = useState<typeof mockFactors[0] | null>(null);

  const toggleSpec = (spec: string) => {
    setSelectedSpecs(prev => 
      prev.includes(spec) 
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const filteredFactors = mockFactors.filter(factor => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!factor.name?.toLowerCase().includes(query) && 
          !factor.address.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (factor.maxAdvanceRate < advanceRateRange[0] || factor.minAdvanceRate > advanceRateRange[1]) {
      return false;
    }
    if (minInvoiceAmount && factor.maxInvoice < parseFloat(minInvoiceAmount)) {
      return false;
    }
    if (selectedSpecs.length > 0 && !selectedSpecs.some(s => factor.specializations.includes(s))) {
      return false;
    }
    return true;
  });

  return (
    <div className="container py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {activeRole === 'factor' ? 'Browse Invoices' : 'Browse Factors'}
        </h1>
        <p className="text-muted-foreground">
          {activeRole === 'factor' 
            ? 'Find invoices to factor and grow your portfolio'
            : 'Find the best factoring terms for your invoices'
          }
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Advance Rate Range */}
            <div className="space-y-3">
              <Label>Advance Rate Range</Label>
              <Slider
                value={advanceRateRange}
                onValueChange={setAdvanceRateRange}
                min={50}
                max={99}
                step={1}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{advanceRateRange[0]}%</span>
                <span>{advanceRateRange[1]}%</span>
              </div>
            </div>

            {/* Minimum Invoice Amount */}
            <div className="space-y-2">
              <Label htmlFor="minAmount">Minimum Invoice Amount</Label>
              <Input
                id="minAmount"
                type="number"
                placeholder="0 ALEO"
                value={minInvoiceAmount}
                onChange={(e) => setMinInvoiceAmount(e.target.value)}
              />
            </div>

            {/* Specializations */}
            <div className="space-y-3">
              <Label>Specializations</Label>
              <div className="space-y-2">
                {specializations.map((spec) => (
                  <div key={spec} className="flex items-center gap-2">
                    <Checkbox
                      id={spec}
                      checked={selectedSpecs.includes(spec)}
                      onCheckedChange={() => toggleSpec(spec)}
                    />
                    <Label htmlFor={spec} className="text-sm font-normal cursor-pointer">
                      {spec}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSearchQuery('');
                setAdvanceRateRange([50, 99]);
                setMinInvoiceAmount('');
                setSelectedSpecs([]);
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search factors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            {filteredFactors.length} factor{filteredFactors.length !== 1 ? 's' : ''} found
          </p>

          {/* Factor Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredFactors.map((factor) => (
              <Card key={factor.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {factor.name || 'Anonymous Factor'}
                        </CardTitle>
                        {factor.verified && (
                          <Shield className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <AddressDisplay address={factor.address} chars={4} />
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Advance Rate</p>
                      <p className="font-semibold text-primary">
                        {factor.minAdvanceRate}% - {factor.maxAdvanceRate}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Typical Fee</p>
                      <p className="font-semibold">{factor.typicalFee}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Volume</p>
                      <p className="font-mono text-sm">
                        {(factor.totalVolume / 1000000).toFixed(2)}M ALEO
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="font-semibold text-primary">{factor.successRate}%</p>
                    </div>
                  </div>

                  {/* Invoice Range */}
                  <div className="text-sm text-muted-foreground">
                    Accepts: {formatAleo(factor.minInvoice)} - {formatAleo(factor.maxInvoice)}
                  </div>

                  {/* Specializations */}
                  <div className="flex flex-wrap gap-1">
                    {factor.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1" onClick={() => setSelectedFactor(factor)}>
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {factor.name || 'Anonymous Factor'}
                            {factor.verified && <Shield className="h-5 w-5 text-primary" />}
                          </DialogTitle>
                          <DialogDescription>
                            <AddressDisplay address={factor.address} showExplorer />
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Advance Rate Range</p>
                              <p className="text-lg font-semibold text-primary">
                                {factor.minAdvanceRate}% - {factor.maxAdvanceRate}%
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Typical Fee</p>
                              <p className="text-lg font-semibold">{factor.typicalFee}%</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Invoice Range</p>
                              <p className="text-sm font-mono">
                                {formatAleo(factor.minInvoice)} - {formatAleo(factor.maxInvoice)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Recourse</p>
                              <p className="text-sm capitalize">{factor.recourse.replace('_', ' ')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{factor.invoicesFactored}</p>
                              <p className="text-xs text-muted-foreground">Invoices</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold">{factor.successRate}%</p>
                              <p className="text-xs text-muted-foreground">Success</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold">{factor.avgProcessingTime}</p>
                              <p className="text-xs text-muted-foreground">Avg Time</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button className="flex-1">Request Quote</Button>
                            <Button variant="outline" className="flex-1">Message</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button className="flex-1">Request Quote</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFactors.length === 0 && (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No factors found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to see more results
              </p>
              <Button variant="outline" onClick={() => {
                setAdvanceRateRange([50, 99]);
                setMinInvoiceAmount('');
                setSelectedSpecs([]);
              }}>
                Reset Filters
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
