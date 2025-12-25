import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { usePhones, useIps, useSlots, useCreateSlot, useDeleteSlot } from "@/hooks/use-data";
import type { Phone, Ip } from "@shared/schema";
import { SLOT_LIMIT, getSlotCutoffDate, calculateTotalUsage, isAtCapacity, getRemainingSlots, getUsagePercentage } from "@shared/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Smartphone, Network, CheckCircle2, Search, X, Download, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Dashboard() {
  const { data: phones, isLoading: phonesLoading } = usePhones();
  const { data: ips, isLoading: ipsLoading } = useIps();
  const { data: slots, isLoading: slotsLoading } = useSlots();
  const createSlotMutation = useCreateSlot();
  const deleteSlotMutation = useDeleteSlot();
  
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  // Allocation type: phone or ip (independent allocations)
  const [allocationType, setAllocationType] = useState<'phone' | 'ip'>('phone');
  // Select search states for allocation dropdowns (helps with large lists)
  const [phoneSelectQuery, setPhoneSelectQuery] = useState("");
  const [ipSelectQuery, setIpSelectQuery] = useState("");

  // Details Dialog State
  const [detailPhone, setDetailPhone] = useState<Phone | null>(null);
  const [detailIp, setDetailIp] = useState<Ip | null>(null);
  
  // Slot Creation State
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [selectedIpId, setSelectedIpId] = useState<string>("");
  const [slotCount, setSlotCount] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState("");
  // Phone filters: slot-count only (no provider)
  const [phoneSlotFilter, setPhoneSlotFilter] = useState<"all" | "0" | "1" | "2" | "3" | "4">("all");
  // IP filters: slot-count and provider
  const [ipSlotFilter, setIpSlotFilter] = useState<"all" | "0" | "1" | "2" | "3" | "4">("all");
  const [ipProviderFilter, setIpProviderFilter] = useState<string>("all");

  // Selection state for exporting specific IPs (checkboxes)
  const [selectedIpIds, setSelectedIpIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination state
  const [phonePage, setPhonePage] = useState(1);
  const [ipPage, setIpPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Copy to clipboard function
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success(`Copied: ${text}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  // Helper function to calculate slot usage within 15 days
  const getPhoneSlotUsage = (phoneId: string): number => {
    if (!slots) return 0;
    const cutoffDate = getSlotCutoffDate();
    
    const relevantSlots = slots.filter(slot => 
      slot.phoneId === phoneId && 
      new Date(slot.usedAt) >= cutoffDate
    );
    
    return calculateTotalUsage(relevantSlots);
  };

  const getIpSlotUsage = (ipId: string): number => {
    if (!slots) return 0;
    const cutoffDate = getSlotCutoffDate();
    
    const relevantSlots = slots.filter(slot => 
      slot.ipId === ipId && 
      new Date(slot.usedAt) >= cutoffDate
    );
    
    return calculateTotalUsage(relevantSlots);
  };

  const handleCreateSlot = async () => {
    // Validate depending on allocation type (phone or ip)
    if (allocationType === 'phone' && !selectedPhoneId) {
      toast.error('Please select a phone');
      return;
    }
    if (allocationType === 'ip' && !selectedIpId) {
      toast.error('Please select an IP');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    
    try {
      // Build payload and omit unused id; send usedAt as ISO string
      const payload: any = { count: slotCount, usedAt: selectedDate.toISOString() };
      if (allocationType === 'phone') payload.phoneId = selectedPhoneId;
      else payload.ipId = selectedIpId;

      await createSlotMutation.mutateAsync(payload);

      toast.success("Slot allocation created successfully");
      setIsSlotDialogOpen(false);
      // Reset form
      setSelectedPhoneId("");
      setSelectedIpId("");
      setSlotCount(1);
      setSelectedDate(new Date());
      setAllocationType('phone');
    } catch (error) {
      toast.error("Failed to create slot allocation");
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (confirm("Are you sure you want to remove this slot allocation?")) {
      try {
        await deleteSlotMutation.mutateAsync(id);
        toast.success("Slot removed");
      } catch (error) {
        toast.error("Failed to delete slot");
      }
    }
  };

  const filteredPhones = useMemo(() => {
    if (!phones) return [];
    return phones
      .filter(p =>
        p.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.remark?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      // apply slot-count filter
      .filter(p => {
        const usage = getPhoneSlotUsage(p.id);
        if (phoneSlotFilter === 'all') return true;
        if (phoneSlotFilter === '4') return usage >= 4;
        return usage === parseInt(phoneSlotFilter, 10);
      })
      // Sort by usage ascending (most free first), then by phoneNumber
      .sort((a, b) => {
        const ua = getPhoneSlotUsage(a.id);
        const ub = getPhoneSlotUsage(b.id);
        if (ua !== ub) return ua - ub;
        return a.phoneNumber.localeCompare(b.phoneNumber);
      });
  }, [phones, searchQuery, slots, phoneSlotFilter]);

  // Paginated phones
  const totalPhonePages = Math.ceil(filteredPhones.length / ITEMS_PER_PAGE);
  const paginatedPhones = useMemo(() => {
    const startIdx = (phonePage - 1) * ITEMS_PER_PAGE;
    return filteredPhones.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredPhones, phonePage]);

  const filteredIps = useMemo(() => {
    if (!ips) return [];
    return ips
      .filter(i =>
        i.ipAddress.includes(searchQuery) ||
        i.remark?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      // apply slot-count filter if any
      .filter(i => {
        if (ipSlotFilter === 'all') return true;
        const usage = getIpSlotUsage(i.id);
        if (ipSlotFilter === '4') return usage >= 4;
        return usage === parseInt(ipSlotFilter, 10);
      })
      // apply provider filter if any
      .filter(i => {
        if (ipProviderFilter === 'all') return true;
        return (i.provider || '') === ipProviderFilter;
      })
      // Sort by usage ascending (most free first), then by ipAddress
      .sort((a, b) => {
        const ua = getIpSlotUsage(a.id);
        const ub = getIpSlotUsage(b.id);
        if (ua !== ub) return ua - ub;
        return a.ipAddress.localeCompare(b.ipAddress);
      });
  }, [ips, searchQuery, slots, ipSlotFilter, ipProviderFilter]);

  // Paginated IPs
  const totalIpPages = Math.ceil(filteredIps.length / ITEMS_PER_PAGE);
  const paginatedIps = useMemo(() => {
    const startIdx = (ipPage - 1) * ITEMS_PER_PAGE;
    return filteredIps.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredIps, ipPage]);

  // Reset pages when filters change
  useMemo(() => {
    setPhonePage(1);
  }, [searchQuery, phoneSlotFilter]);

  useMemo(() => {
    setIpPage(1);
  }, [searchQuery, ipSlotFilter, ipProviderFilter]);

  // unique providers for IPs (used in provider dropdown)
  const uniqueProviders = useMemo<string[]>(() => {
    if (!ips) return [];
    const set = new Set<string>();
    ips.forEach(i => { if (i.provider) set.add(i.provider); });
    return Array.from(set).sort();
  }, [ips]);

  // Selectable lists for allocation dropdowns (apply separate small search & order by free)
  const selectablePhones = useMemo<Phone[]>(() => {
    if (!phones) return [];
    return phones
      .filter(p => p.phoneNumber.toLowerCase().includes(phoneSelectQuery.toLowerCase()) || p.remark?.toLowerCase().includes(phoneSelectQuery.toLowerCase()))
      .sort((a, b) => {
        const ua = getPhoneSlotUsage(a.id);
        const ub = getPhoneSlotUsage(b.id);
        if (ua !== ub) return ua - ub;
        return a.phoneNumber.localeCompare(b.phoneNumber);
      });
  }, [phones, phoneSelectQuery, slots]);

  const selectableIps = useMemo<Ip[]>(() => {
    if (!ips) return [];
    return ips
      .filter(i => i.ipAddress.includes(ipSelectQuery) || i.remark?.toLowerCase().includes(ipSelectQuery.toLowerCase()))
      .sort((a, b) => {
        const ua = getIpSlotUsage(a.id);
        const ub = getIpSlotUsage(b.id);
        if (ua !== ub) return ua - ub;
        return a.ipAddress.localeCompare(b.ipAddress);
      });
  }, [ips, ipSelectQuery, slots]);

  // Metrics
  const totalPhones = phones?.length || 0;
  const totalIps = ips?.length || 0;
  const availablePhones = phones?.filter(p => !isAtCapacity(getPhoneSlotUsage(p.id))).length || 0;
  const availableIps = ips?.filter(i => !isAtCapacity(getIpSlotUsage(i.id))).length || 0;

  // toggle single ip selection
  const toggleIpSelect = (id: string) => {
    setSelectedIpIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // select/unselect all visible ips
  const toggleSelectAllVisible = (checked: boolean) => {
    const newMap: Record<string, boolean> = { ...selectedIpIds };
    paginatedIps.forEach(ip => { newMap[ip.id] = checked; });
    setSelectedIpIds(newMap);
  };

  // export only checked IPs (ignoring filters) - uses current ips list and selectedIpIds map
  const exportSelectedTxt = () => {
    if (!ips) return toast.error('No IPs available');
    const toExport = ips.filter(ip => selectedIpIds[ip.id]);
    if (toExport.length === 0) return toast.error('No IPs selected');
    const lines = toExport.map(ip => [ip.ipAddress, ip.port || "", ip.username || "", ip.password || ""].join(':'));
    const txt = lines.join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ips_selected_export_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${toExport.length} IPs`);
  };

  const isLoading = phonesLoading || ipsLoading || slotsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center" data-testid="loading-state">
            <div className="text-lg font-medium text-muted-foreground">Loading...</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Export IP slots as CSV
  const exportIpCsv = (ip: Ip) => {
    if (!slots) return;
    const rows = slots.filter(s => s.ipId === ip.id).map(s => ({
      date: format(new Date(s.usedAt), 'yyyy-MM-dd'),
      count: s.count || 1,
      phoneId: s.phoneId || "",
    }));
    const header = ['date','count','phoneId'];
    const csv = [header.join(',')].concat(rows.map(r => `${r.date},${r.count},${r.phoneId}`)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-${ip.ipAddress.replace(/[:\\/\\\\]/g,'_')}-slots.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time system resource monitoring</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 pr-9 bg-background h-9 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 p-0 cursor-pointer hover:bg-transparent"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
            <Button 
              onClick={() => setIsSlotDialogOpen(true)} 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all h-9 w-full sm:w-auto cursor-pointer" 
              data-testid="button-new-allocation"
            >
              <Link2 className="mr-2 h-4 w-4" />
              New Allocation
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Phones" value={totalPhones} icon={Smartphone} gradient="from-blue-500 to-cyan-500" />
          <MetricCard title="Total IPs" value={totalIps} icon={Network} gradient="from-indigo-500 to-purple-500" />
          <MetricCard title="Available Phones" value={availablePhones} icon={CheckCircle2} gradient="from-green-500 to-emerald-500" />
          <MetricCard title="Available IPs" value={availableIps} icon={CheckCircle2} gradient="from-teal-500 to-cyan-500" />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Phone List */}
          <Card className="shadow-lg flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 pb-3 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-semibold tracking-tight">Phone Utilization</CardTitle>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <Badge variant="outline" className="bg-background font-mono text-xs">{filteredPhones.length} Devices</Badge>
                  <div className="flex-1 sm:flex-initial">
                    <Select value={phoneSlotFilter} onValueChange={(v) => setPhoneSlotFilter(v as any)}>
                      <SelectTrigger className="h-8 w-full sm:min-w-[80px] cursor-pointer">
                        <SelectValue placeholder="Slots" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div className="h-[500px] lg:h-[600px] flex flex-col">
                <div className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="w-[140px] sm:w-[180px] h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-4 sm:pl-6">Device</TableHead>
                        <TableHead className="w-[100px] sm:w-[180px] h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-4 sm:pl-6">Available</TableHead>
                        <TableHead className="h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right pr-4 sm:pr-6">Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPhones.map(phone => {
                    const usage = getPhoneSlotUsage(phone.id);
                    const isFull = isAtCapacity(usage);
                    const percentage = getUsagePercentage(usage);
                    const remaining = getRemainingSlots(usage);

                    return (
                      <TableRow 
                        key={phone.id} 
                        className="cursor-pointer hover:bg-muted/40 transition-colors h-12 sm:h-14 border-b border-border/40 group"
                        onClick={() => setDetailPhone(phone)}
                        data-testid={`row-phone-${phone.id}`}
                      >
                        <TableCell className="pl-4 sm:pl-6 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5 flex-1" onClick={() => setDetailPhone(phone)}>
                              <span className="text-xs sm:text-sm font-mono text-foreground/90 group-hover:text-primary transition-colors truncate" data-testid={`text-phone-number-${phone.id}`}>{phone.phoneNumber}</span>
                              {phone.remark && <span className="text-[9px] sm:text-[10px] text-destructive truncate max-w-[100px] sm:max-w-[120px]">{phone.remark}</span>}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(phone.phoneNumber, `phone-${phone.id}`);
                              }}
                            >
                              {copiedId === `phone-${phone.id}` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="pl-4 sm:pl-6 font-medium">
                          <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                              isFull ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                              remaining === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              remaining >= 1 && remaining <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`} data-testid={`badge-usage-${phone.id}`}>
                          {remaining}
                        </span>
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-6">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                <span
                                    className={isFull ? "text-destructive font-bold" : "text-muted-foreground font-medium"}
                                    data-testid={`text-phone-usage-${phone.id}`}>
                                  {usage} <span className="text-destructive font-normal">/ {SLOT_LIMIT}</span>
                                </span>
                             </div>

                            <Progress value={percentage} className={`h-1.5 w-16 sm:w-24 ${isFull ? '[&>div]:bg-destructive' : '[&>div]:bg-indigo-500'}`} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                      {paginatedPhones.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Smartphone className="h-8 w-8 opacity-20" />
                              <span className="text-sm">No phones found</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {filteredPhones.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/5">
                    <div className="text-xs text-muted-foreground">
                      Showing {((phonePage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(phonePage * ITEMS_PER_PAGE, filteredPhones.length)} of {filteredPhones.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPhonePage(p => Math.max(1, p - 1))}
                        disabled={phonePage === 1}
                        className="h-7 cursor-pointer"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <div className="text-xs">
                        {phonePage} / {totalPhonePages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPhonePage(p => Math.min(totalPhonePages, p + 1))}
                        disabled={phonePage === totalPhonePages}
                        className="h-7 cursor-pointer"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
        </Card>

        {/* IP List */}
        <Card className="shadow-lg flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 pb-2 pt-3 px-3 sm:px-4 border-b border-slate-200 dark:border-slate-800">
            {/* Row 1: Title left, count right */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold tracking-tight">IP Utilization</CardTitle>
                </div>
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="bg-background font-mono text-xs">{filteredIps.length} IPs</Badge>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 w-full">
              <div className="flex-1 min-w-[100px]">
                <Select value={ipSlotFilter} onValueChange={(v) => setIpSlotFilter(v as any)}>
                  <SelectTrigger className="h-8 w-full cursor-pointer">
                    <SelectValue placeholder="Slots" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <Select value={ipProviderFilter} onValueChange={(v) => setIpProviderFilter(v || 'all')}>
                  <SelectTrigger className="h-8 w-full cursor-pointer">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {uniqueProviders.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <Button 
                  className="w-full h-8 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950" 
                  variant="outline" 
                  size="sm" 
                  onClick={exportSelectedTxt} 
                  title="Export Selected" 
                  disabled={!Object.values(selectedIpIds).some(Boolean)} 
                  data-testid="button-export-selected"
                >
                  <Download className="h-4 w-4 mr-2" />Export
                </Button>
              </div>
            </div>
          </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div className="h-[500px] lg:h-[600px] flex flex-col">
                {/* Desktop table (hidden on mobile) */}
                <div className="hidden sm:block flex-1 overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="w-8 sm:w-12 h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-2 sm:pl-3">
                          <input
                            type="checkbox"
                            className="scale-75 sm:scale-100"
                            aria-label="select all visible"
                            checked={paginatedIps.length > 0 && paginatedIps.every(ip => selectedIpIds[ip.id])}
                            onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                          />
                        </TableHead>
                        <TableHead className="w-[160px] sm:w-[220px] h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">IP Address</TableHead>
                        <TableHead className="w-[100px] sm:w-[160px] h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Provider</TableHead>
                        <TableHead className="w-[80px] sm:w-[140px] h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available</TableHead>
                        <TableHead className="h-10 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right pr-4 sm:pr-6">Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {paginatedIps.map(ip => {
                      const usage = getIpSlotUsage(ip.id);
                      const isFull = isAtCapacity(usage);
                      const percentage = getUsagePercentage(usage);
                      const remaining = getRemainingSlots(usage);

                      return (
                        <TableRow key={ip.id} className="hover:bg-muted/40 cursor-pointer transition-colors h-12 sm:h-14 border-b border-border/40 group" data-testid={`row-ip-${ip.id}`}>
                          <TableCell className="pl-2 sm:pl-3 align-middle">
                            <input type="checkbox" className="scale-75 sm:scale-100" checked={!!selectedIpIds[ip.id]} onChange={() => toggleIpSelect(ip.id)} onClick={(e) => e.stopPropagation()} aria-label={`select-${ip.id}`} />
                          </TableCell>
                          <TableCell className="pl-2 font-medium align-middle">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-0.5 flex-1" onClick={() => setDetailIp(ip)}>
                                <span className="text-xs sm:text-sm font-mono text-foreground/90 group-hover:text-primary transition-colors truncate" data-testid={`text-ip-address-${ip.id}`}>{ip.ipAddress}</span>
                                {ip.remark && <span className="text-[9px] sm:text-[10px] text-red-500 truncate max-w-[140px] sm:max-w-[260px]">{ip.remark}</span>}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(ip.ipAddress, `ip-${ip.id}`);
                                }}
                              >
                                {copiedId === `ip-${ip.id}` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="align-middle hidden lg:table-cell" onClick={() => setDetailIp(ip)}>{ip.provider || '-'}</TableCell>
                          <TableCell className="pl-4 sm:pl-6 align-middle cursor-pointer" onClick={() => setDetailIp(ip)}>
                            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                              remaining === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              remaining >= 1 && remaining <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`} data-testid={`badge-usage-${ip.id}`}>{remaining}</span>
                          </TableCell>
                          <TableCell className="text-right pr-4 sm:pr-6 align-middle">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                <span className={isFull ? "text-destructive font-bold" : "text-muted-foreground font-medium"} data-testid={`text-ip-usage-${ip.id}`}>{usage} <span className="text-destructive font-normal">/ {SLOT_LIMIT}</span></span>
                              </div>
                              <Progress value={percentage} className={`h-1.5 w-16 sm:w-24 ${isFull ? '[&>div]:bg-destructive' : '[&>div]:bg-indigo-500'}`} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginatedIps.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Network className="h-8 w-8 opacity-20" />
                            <span className="text-sm">No IPs found</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list (visible only on small screens) */}
              <div className="sm:hidden flex-1 overflow-auto p-3 space-y-3">
                {paginatedIps.map(ip => {
                  const usage = getIpSlotUsage(ip.id);
                  const isFull = isAtCapacity(usage);
                  const percentage = getUsagePercentage(usage);
                  const remaining = getRemainingSlots(usage);
                  return (
                    <div key={ip.id} className="flex items-start justify-between gap-3 p-3 bg-card/60 border border-border rounded-lg" data-testid={`mobile-row-ip-${ip.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <input type="checkbox" checked={!!selectedIpIds[ip.id]} onChange={() => toggleIpSelect(ip.id)} onClick={(e) => e.stopPropagation()} aria-label={`select-${ip.id}`} />
                        </div>
                        <div onClick={() => setDetailIp(ip)} className="min-w-0 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm truncate">{ip.ipAddress}</span>
                            {ip.provider && <Badge variant="outline" className="text-xs">{ip.provider}</Badge>}
                          </div>
                          {ip.remark && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ip.remark}</div>}
                          <div className="mt-2 flex items-center gap-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{usage}</span>
                            <span className="text-xs text-muted-foreground">{remaining} / {SLOT_LIMIT}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="w-24">
                          <Progress value={percentage} className="h-2" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {paginatedIps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="h-8 w-8 opacity-20 mx-auto" />
                    <div className="mt-2">No IPs found</div>
                  </div>
                )}
              </div>
              
              {/* Pagination */}
              {filteredIps.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/5">
                  <div className="text-xs text-muted-foreground">
                    Showing {((ipPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(ipPage * ITEMS_PER_PAGE, filteredIps.length)} of {filteredIps.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIpPage(p => Math.max(1, p - 1))}
                      disabled={ipPage === 1}
                      className="h-7 cursor-pointer"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <div className="text-xs">
                      {ipPage} / {totalIpPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIpPage(p => Math.min(totalIpPages, p + 1))}
                      disabled={ipPage === totalIpPages}
                      className="h-7 cursor-pointer"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Create Slot Allocation</DialogTitle>
            <DialogDescription className="text-base">
              Allocate slots for phone or IP address. Maximum <span className="font-semibold text-foreground">{SLOT_LIMIT} slots</span> allowed per resource within <span className="font-semibold text-foreground">15 days</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Allocation type toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Resource Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={allocationType === 'phone' ? 'default' : 'outline'}
                  onClick={() => setAllocationType('phone')}
                  className={`cursor-pointer h-12 ${
                    allocationType === 'phone' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700' 
                      : 'hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950'
                  }`}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Phone
                </Button>
                <Button
                  type="button"
                  variant={allocationType === 'ip' ? 'default' : 'outline'}
                  onClick={() => setAllocationType('ip')}
                  className={`cursor-pointer h-12 ${
                    allocationType === 'ip' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700' 
                      : 'hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                  }`}
                >
                  <Network className="mr-2 h-4 w-4" />
                  IP Address
                </Button>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Allocation Date</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div className="text-sm font-medium">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "No date selected"}
                  </div>
                  {selectedDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="cursor-pointer h-7"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input
                  type="date"
                  value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)
                  }
                  className="cursor-pointer"
                  data-testid="input-allocation-date"
                />
              </div>
            </div>

            {/* Slot Count and Resource Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="count" className="text-sm font-semibold text-foreground">Slot Count</Label>
                <Select onValueChange={(v) => setSlotCount(parseInt(v || '1'))} value={String(slotCount)}>
                  <SelectTrigger data-testid="select-slot-count" className="h-11 cursor-pointer">
                    <SelectValue placeholder="Count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Slot</SelectItem>
                    <SelectItem value="2">2 Slots</SelectItem>
                    <SelectItem value="3">3 Slots</SelectItem>
                    <SelectItem value="4">4 Slots</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resource selector (Phone or IP) */}
              <div className="space-y-3">
                {allocationType === 'phone' ? (
                  <>
                    <Label htmlFor="phone" className="text-sm font-semibold text-foreground">Select Phone</Label>
                    <Select onValueChange={setSelectedPhoneId} value={selectedPhoneId}>
                      <SelectTrigger data-testid="select-phone" className="h-11 cursor-pointer">
                        <SelectValue placeholder="Choose phone..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-[400px]">
                        <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search phones..."
                              value={phoneSelectQuery}
                              onChange={(e) => setPhoneSelectQuery(e.target.value)}
                              className="pl-8"
                              data-testid="input-select-search-phone"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {selectablePhones.map(phone => {
                            const usage = getPhoneSlotUsage(phone.id);
                            const remaining = getRemainingSlots(usage);
                            const disabled = isAtCapacity(usage);
                            return (
                              <SelectItem key={phone.id} value={phone.id} disabled={disabled} className="cursor-pointer">
                                <div className="flex justify-between items-center w-full gap-3">
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-mono text-sm truncate">{phone.phoneNumber}</span>
                                    {phone.remark && <span className="text-xs text-muted-foreground truncate">{phone.remark}</span>}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    disabled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    remaining <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    {remaining} left
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </div>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <Label htmlFor="ip" className="text-sm font-semibold text-foreground">Select IP</Label>
                    <Select onValueChange={setSelectedIpId} value={selectedIpId}>
                      <SelectTrigger data-testid="select-ip" className="h-11 cursor-pointer">
                        <SelectValue placeholder="Choose IP..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-[400px]">
                        <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search IPs..."
                              value={ipSelectQuery}
                              onChange={(e) => setIpSelectQuery(e.target.value)}
                              className="pl-8"
                              data-testid="input-select-search-ip"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {selectableIps.map(ip => {
                            const usage = getIpSlotUsage(ip.id);
                            const remaining = getRemainingSlots(usage);
                            const disabled = isAtCapacity(usage);
                            return (
                              <SelectItem key={ip.id} value={ip.id} disabled={disabled} className="cursor-pointer">
                                <div className="flex justify-between items-center w-full gap-3">
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-mono text-sm truncate">{ip.ipAddress}</span>
                                    {ip.remark && <span className="text-xs text-muted-foreground truncate">{ip.remark}</span>}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    disabled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                    remaining <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    {remaining} left
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </div>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>
          </div>

           <DialogFooter className="gap-2">
             <Button
                 type="button"
                 variant="outline"
                 onClick={() => setIsSlotDialogOpen(false)}
                 data-testid="button-cancel-allocation"
                 className="cursor-pointer flex-1 sm:flex-initial"
             >
               Cancel
             </Button>
             <Button
                 type="button"
                 onClick={handleCreateSlot}
                 disabled={createSlotMutation.isPending}
                 data-testid="button-confirm-allocation"
                 className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 cursor-pointer flex-1 sm:flex-initial shadow-md"
             >
               {createSlotMutation.isPending ? (
                 <>
                   <span className="mr-2">Creating...</span>
                   <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                 </>
               ) : (
                 <>
                   <CheckCircle2 className="mr-2 h-4 w-4" />
                   Confirm Allocation
                 </>
               )}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>


       {/* Phone Details Dialog */}
       <Dialog open={!!detailPhone} onOpenChange={(open) => !open && setDetailPhone(null)}>
         <DialogContent className="sm:max-w-[600px]">
           <DialogHeader>
             <DialogTitle>Phone Usage Details</DialogTitle>
             <DialogDescription className="font-mono">
               {detailPhone?.phoneNumber}
             </DialogDescription>
           </DialogHeader>
           <div className="py-2">
              <Table>
                <TableHeader>
                  <TableRow className="h-8 hover:bg-transparent">
                   <TableHead className="h-8 text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-right h-8 text-xs font-semibold">Slots</TableHead>
                    <TableHead className="w-[40px] h-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPhone && slots?.filter(s => s.phoneId === detailPhone.id).length === 0 && (
                    <TableRow>
                     <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-xs">No active allocations</TableCell>
                    </TableRow>
                  )}
                  {detailPhone && slots
                    ?.filter(s => s.phoneId === detailPhone.id)
                    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                    .map(slot => {
                      return (
                        <TableRow key={slot.id} className="h-10 hover:bg-muted/30">
                         <TableCell className="text-xs py-1 text-muted-foreground">{format(new Date(slot.usedAt), "MMM d, yyyy")}</TableCell>
                         <TableCell className="text-right font-medium text-xs py-1">{slot.count || 1}</TableCell>
                          <TableCell className="py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={deleteSlotMutation.isPending}
                              data-testid={`button-delete-slot-${slot.id}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
           </div>
         </DialogContent>
       </Dialog>

       {/* IP Details Dialog */}
       <Dialog open={!!detailIp} onOpenChange={(open) => !open && setDetailIp(null)}>
         <DialogContent className="sm:max-w-[600px]">
           <DialogHeader>
             <DialogTitle>IP Usage Details</DialogTitle>
             <DialogDescription className="font-mono">
               {detailIp?.ipAddress}
             </DialogDescription>
           </DialogHeader>
           {/* No export buttons in IP Usage Details as requested */}
           <div className="px-4 pb-2" />
           <div className="py-2">
              <Table>
                <TableHeader>
                  <TableRow className="h-8 hover:bg-transparent">
                   <TableHead className="h-8 text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-right h-8 text-xs font-semibold">Slots</TableHead>
                    <TableHead className="w-[40px] h-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailIp && slots?.filter(s => s.ipId === detailIp.id).length === 0 && (
                    <TableRow>
                     <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-xs">No active allocations</TableCell>
                    </TableRow>
                  )}
                  {detailIp && slots
                    ?.filter(s => s.ipId === detailIp.id)
                    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                    .map(slot => {
                      // ageDays: number of days since usedAt
                      const ageMs = Date.now() - new Date(slot.usedAt).getTime();
                      const ageDays = ageMs / (1000 * 60 * 60 * 24);
                      // within 15 days => highlight light red; otherwise light green
                      const rowBgClass = ageDays < 15 ? 'bg-red-50' : 'bg-green-50';
                       return (
                        <TableRow key={slot.id} className={`h-10 hover:bg-muted/30 ${rowBgClass}`}>
                         <TableCell className="text-xs py-1 text-muted-foreground">{format(new Date(slot.usedAt), "MMM d, yyyy")}</TableCell>
                         <TableCell className="text-right font-medium text-xs py-1">{slot.count || 1}</TableCell>
                          <TableCell className="py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={deleteSlotMutation.isPending}
                              data-testid={`button-delete-slot-${slot.id}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                       );
                     })}
                </TableBody>
              </Table>
           </div>
         </DialogContent>
       </Dialog>
      </div>
    </Layout>
  );
}

 function MetricCard({ title, value, icon: Icon, gradient }: { title: string, value: number, icon: any, gradient: string }) {
   return (
     <Card className="shadow-lg border-0 overflow-hidden bg-white dark:bg-slate-950 hover:shadow-xl transition-all cursor-default">
       <div className={`h-1 bg-gradient-to-r ${gradient}`} />
       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 py-3 sm:py-4">
         <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">{title}</CardTitle>
         <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} shadow-md`}>
           <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
         </div>
       </CardHeader>
       <CardContent className="pb-3 sm:pb-4">
         <div className={`text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</div>
       </CardContent>
     </Card>
   );
 }
