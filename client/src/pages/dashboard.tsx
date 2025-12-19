import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { usePhones, useIps, useSlots, useCreateSlot, useDeleteSlot } from "@/hooks/use-data";
import type { Phone, Ip } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Smartphone, Network, CheckCircle2, Search, X } from "lucide-react";
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
  // Filters: all, used (full), partial (some used), free (no usage)
  const [phoneFilter, setPhoneFilter] = useState<"all" | "used" | "partial" | "free">("all");
  const [ipFilter, setIpFilter] = useState<"all" | "used" | "partial" | "free">("all");
  // New IP-specific filters: slot number and provider
  const [ipSlotFilter, setIpSlotFilter] = useState<"all" | "0" | "1" | "2" | "3" | "4+">("all");
  const [ipProviderFilter, setIpProviderFilter] = useState<string>("all");

  // Selection state for exporting specific IPs (checkboxes)
  const [selectedIpIds, setSelectedIpIds] = useState<Record<string, boolean>>({});

  // Helper function to calculate slot usage within 15 days
  const getPhoneSlotUsage = (phoneId: string): number => {
    if (!slots) return 0;
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    return slots
      .filter(slot => slot.phoneId === phoneId)
      .filter(slot => new Date(slot.usedAt) >= fifteenDaysAgo)
      .reduce((sum, slot) => sum + (slot.count || 1), 0);
  };

  const getIpSlotUsage = (ipId: string): number => {
    if (!slots) return 0;
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    return slots
      .filter(slot => slot.ipId === ipId)
      .filter(slot => new Date(slot.usedAt) >= fifteenDaysAgo)
      .reduce((sum, slot) => sum + (slot.count || 1), 0);
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
      .filter(p => {
        const usage = getPhoneSlotUsage(p.id);
        if (phoneFilter === "free") return usage === 0;
        if (phoneFilter === "used") return usage >= 4;
        if (phoneFilter === "partial") return usage > 0 && usage < 4;
        return true;
      })
      // Sort by usage ascending (most free first), then by phoneNumber
      .sort((a, b) => {
        const ua = getPhoneSlotUsage(a.id);
        const ub = getPhoneSlotUsage(b.id);
        if (ua !== ub) return ua - ub;
        return a.phoneNumber.localeCompare(b.phoneNumber);
      });
  }, [phones, searchQuery, phoneFilter, slots]);

  const filteredIps = useMemo(() => {
    if (!ips) return [];
    return ips
      .filter(i =>
        i.ipAddress.includes(searchQuery) ||
        i.remark?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(i => {
        const usage = getIpSlotUsage(i.id);
        if (ipFilter === "free") return usage === 0;
        if (ipFilter === "used") return usage >= 4;
        if (ipFilter === "partial") return usage > 0 && usage < 4;
        return true;
      })
      // apply slot-count filter if any
      .filter(i => {
        if (ipSlotFilter === 'all') return true;
        const usage = getIpSlotUsage(i.id);
        if (ipSlotFilter === '4+') return usage >= 4;
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
  }, [ips, searchQuery, ipFilter, slots, ipSlotFilter, ipProviderFilter]);

  // unique providers list for provider dropdown
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
  const availablePhones = phones?.filter(p => getPhoneSlotUsage(p.id) < 4).length || 0;
  const availableIps = ips?.filter(i => getIpSlotUsage(i.id) < 4).length || 0;

  // toggle single ip selection
  const toggleIpSelect = (id: string) => {
    setSelectedIpIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // select/unselect all visible ips
  const toggleSelectAllVisible = (checked: boolean) => {
    const newMap: Record<string, boolean> = { ...selectedIpIds };
    filteredIps.forEach(ip => { newMap[ip.id] = checked; });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time system resource monitoring.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-9 bg-background h-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Button onClick={() => setIsSlotDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-9" data-testid="button-new-allocation">
            <Link2 className="mr-2 h-4 w-4" />
            New Allocation
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Phones" value={totalPhones} icon={Smartphone} color="border-blue-500" />
        <MetricCard title="Total IPs" value={totalIps} icon={Network} color="border-indigo-500" />
        <MetricCard title="Available Phones" value={availablePhones} icon={CheckCircle2} color="border-green-500" />
        <MetricCard title="Available IPs" value={availableIps} icon={CheckCircle2} color="border-teal-500" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 h-[650px]">
        {/* Phone List */}
        <Card className="col-span-1 shadow-sm flex flex-col h-full overflow-hidden border bg-card/50">
          <CardHeader className="bg-muted/20 pb-3 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Phone Utilization</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-background font-mono text-xs">{filteredPhones.length} Devices</Badge>
                <ToggleGroup type="single" value={phoneFilter} onValueChange={(v) => v && setPhoneFilter(v as any)} className="justify-start" aria-label="Phone filter">
                  <ToggleGroupItem className="cursor-pointer" value="all">All</ToggleGroupItem>
                  <ToggleGroupItem className="cursor-pointer" value="used">Used</ToggleGroupItem>
                  <ToggleGroupItem className="cursor-pointer" value="partial">Partial</ToggleGroupItem>
                  <ToggleGroupItem className="cursor-pointer" value="free">Free</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[180px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-6">Device</TableHead>
                    <TableHead className="w-[180px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-6">Slots Used (15d)</TableHead>
                    <TableHead className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhones.map(phone => {
                    const usage = getPhoneSlotUsage(phone.id);
                    const isFull = usage >= 4;
                    const percentage = Math.min((usage / 4) * 100, 100);

                    return (
                      <TableRow 
                        key={phone.id} 
                        className="cursor-pointer hover:bg-muted/40 transition-colors h-14 border-b border-border/40 group"
                        onClick={() => setDetailPhone(phone)}
                        data-testid={`row-phone-${phone.id}`}
                      >
                        <TableCell className="pl-6 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono text-foreground/90 group-hover:text-primary transition-colors" data-testid={`text-phone-number-${phone.id}`}>{phone.phoneNumber}</span>
                            {phone.remark && <span className="text-[10px] text-destructive truncate max-w-[120px]">{phone.remark}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="pl-6 font-medium">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              usage >= 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`} data-testid={`badge-usage-${phone.id}`}>
                          {usage}
                        </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2 text-xs">
                                <span
                                    className={isFull ? "text-destructive font-bold" : "text-muted-foreground font-medium"}
                                    data-testid={`text-phone-usage-${phone.id}`}>
                                  {4 - usage} <span className="text-destructive font-normal">/ 4</span>
                                </span>
                             </div>
                             <Progress 
                                value={percentage} 
                                className={`h-1.5 w-24 bg-green-500 ${isFull ? '[&>div]:bg-destructive' : '[&>div]:bg-blue-500'}`}
                              />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPhones.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={2} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Smartphone className="h-8 w-8 opacity-20" />
                            <span className="text-sm">No phones found</span>
                          </div>
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* IP List */}
        <Card className="col-span-1 shadow-sm flex flex-col h-full overflow-hidden border bg-card/50">
          <CardHeader className="bg-muted/20 pb-3 py-4 border-b">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">IP Utilization</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-background font-mono text-xs">{filteredIps.length} IPs</Badge>
                <ToggleGroup type="single" value={ipFilter} onValueChange={(v) => v && setIpFilter(v as any)} className="justify-start" aria-label="IP filter">
                  <ToggleGroupItem className="cursor-pointer" value="all">All</ToggleGroupItem>
                  <ToggleGroupItem className="cursor-pointer" value="used">Used</ToggleGroupItem>
                  <ToggleGroupItem className="cursor-pointer" value="partial">Partial</ToggleGroupItem>
                  <ToggleGroupItem className="cursor-pointer" value="free">Free</ToggleGroupItem>
                </ToggleGroup>
                {/* Slot number filter dropdown */}
                <Select value={ipSlotFilter} onValueChange={(v) => setIpSlotFilter(v as any)}>
                  <SelectTrigger className="h-8 min-w-[80px]">
                    <SelectValue placeholder="Slots" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4+">4+</SelectItem>
                  </SelectContent>
                </Select>

                {/* Provider filter dropdown */}
                <Select value={ipProviderFilter} onValueChange={(v) => setIpProviderFilter(v || 'all')}>
                  <SelectTrigger className="h-8 min-w-[120px]">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Providers</SelectItem>
                    {uniqueProviders.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Export uses only selected checkboxes, not filters */}
                <Button variant="outline" size="sm" onClick={exportSelectedTxt} title="Export Selected" disabled={!Object.values(selectedIpIds).some(Boolean)} data-testid="button-export-selected">
                  Export Selected
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                   <TableHead className="w-12 h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-3">
                     <input
                       type="checkbox"
                       aria-label="select all visible"
                       checked={filteredIps.length > 0 && filteredIps.every(ip => selectedIpIds[ip.id])}
                       onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                     />
                   </TableHead>
                    <TableHead className="w-[180px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">IP Address</TableHead>
                    <TableHead className="w-[140px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Provider</TableHead>
                    <TableHead className="w-[140px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Port</TableHead>
                    <TableHead className="w-[140px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slots Used (15d)</TableHead>
                    <TableHead className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right pr-6">Capacity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIps.map(ip => {
                    const usage = getIpSlotUsage(ip.id);
                    const isFull = usage >= 4;
                    const percentage = Math.min((usage / 4) * 100, 100);

                    return (
                      <TableRow 
                        key={ip.id} 
                        className="cursor-pointer hover:bg-muted/40 transition-colors h-14 border-b border-border/40 group"
                        data-testid={`row-ip-${ip.id}`}
                      >
                        <TableCell className="pl-3">
                          <input type="checkbox" checked={!!selectedIpIds[ip.id]} onChange={() => toggleIpSelect(ip.id)} onClick={(e) => e.stopPropagation()} aria-label={`select-${ip.id}`} />
                        </TableCell>
                        <TableCell className="pl-2 font-medium" onClick={() => setDetailIp(ip)}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono text-foreground/90 group-hover:text-primary transition-colors" data-testid={`text-ip-address-${ip.id}`}>{ip.ipAddress}</span>
                            {ip.remark && <span className="text-[10px] text-destructive truncate max-w-[120px]">{ip.remark}</span>}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setDetailIp(ip)}>{ip.provider || '-'}</TableCell>
                        <TableCell onClick={() => setDetailIp(ip)} className="font-mono">{ip.port || '-'}</TableCell>
                        <TableCell className="pl-6 font-medium" onClick={() => setDetailIp(ip)}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              usage >= 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`} data-testid={`badge-usage-${ip.id}`}>
                          {usage}
                        </span>
                        </TableCell>
                         <TableCell className="text-right pr-6">
                          <div className="flex flex-col items-end gap-1.5">
                             <div className="flex items-center gap-2 text-xs">
                                <span className={isFull ? "text-destructive font-bold" : "text-muted-foreground font-medium"} data-testid={`text-ip-usage-${ip.id}`}>
                                  {4 - usage} <span className="text-destructive font-normal">/ 4</span>
                                </span>
                             </div>
                             <Progress 
                                value={percentage} 
                                className={`h-1.5 w-24 bg-muted ${isFull ? '[&>div]:bg-destructive' : '[&>div]:bg-indigo-500'}`} 
                              />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredIps.length === 0 && (
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
         </ScrollArea>
       </CardContent>
     </Card>
   </div>

      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Allocation</DialogTitle>
            <DialogDescription>
              Allocate slots for a single Phone or IP. STRICT LIMIT enforced (Max 4 slots / 15 days).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 grid-cols-1">
            {/* Allocation type toggle */}
            <div className="grid gap-2">
              <Label>Allocate For</Label>
              <div className="flex gap-2">
                <Button
                  variant={allocationType === 'phone' ? 'default' : 'outline'}
                  onClick={() => setAllocationType('phone')}
                >Phone</Button>
                <Button
                  variant={allocationType === 'ip' ? 'default' : 'outline'}
                  onClick={() => setAllocationType('ip')}
                >IP</Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Allocation Date</Label>
              <div className="rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </div>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                  >
                    Clear
                  </Button>
                </div>
                <Input
                    type="date"
                    value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                    onChange={(e) =>
                        setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)
                    }
                    data-testid="input-allocation-date"
                />
              </div>
            </div>

            <div>
              <div className="grid gap-2">
                <Label htmlFor="count">Slot Count</Label>
                <Select onValueChange={(v) => setSlotCount(parseInt(v || '1'))} value={String(slotCount)}>
                  <SelectTrigger data-testid="select-slot-count">
                    <SelectValue placeholder="Slots" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[120px]">
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditionally render only the relevant selector */}
              {allocationType === 'phone' ? (
                <div className="grid gap-2 mt-4">
                  <Label htmlFor="phone">Select Phone</Label>
                  <Select onValueChange={setSelectedPhoneId} value={selectedPhoneId}>
                    <SelectTrigger data-testid="select-phone">
                      <SelectValue placeholder="Choose a phone..." />
                    </SelectTrigger>
                    <SelectContent className="min-w-[260px]">
                      <div className="sticky top-0 z-10 bg-popover p-2">
                        <Input
                          placeholder="Search phones..."
                          value={phoneSelectQuery}
                          onChange={(e) => setPhoneSelectQuery(e.target.value)}
                          className="mb-2"
                          data-testid="input-select-search-phone"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[420px] overflow-y-auto py-1">{/* increased height for search overflow */}
                        {selectablePhones.map(phone => {
                          const usage = getPhoneSlotUsage(phone.id);
                          const disabled = usage >= 4;
                          return (
                            <SelectItem key={phone.id} value={phone.id} disabled={disabled}>
                              <div className="flex justify-between items-center w-full min-w-[200px]">
                                <div className="flex flex-col">
                                  <span className="font-mono">{phone.phoneNumber}</span>
                                  {phone.remark && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{phone.remark}</span>}
                                </div>
                                <span className={`text-xs ml-2 ${disabled ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                  ({usage}/4 used)
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2 mt-4">
                  <Label htmlFor="ip">Select IP Address</Label>
                  <Select onValueChange={setSelectedIpId} value={selectedIpId}>
                    <SelectTrigger data-testid="select-ip">
                      <SelectValue placeholder="Choose an IP..." />
                    </SelectTrigger>
                    <SelectContent className="min-w-[260px]">
                      <div className="sticky top-0 z-10 bg-popover p-2">
                        <Input
                          placeholder="Search IPs..."
                          value={ipSelectQuery}
                          onChange={(e) => setIpSelectQuery(e.target.value)}
                          className="mb-2"
                          data-testid="input-select-search-ip"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-[420px] overflow-y-auto py-1">{/* increased height for search overflow */}
                        {selectableIps.map(ip => {
                          const usage = getIpSlotUsage(ip.id);
                          const disabled = usage >= 4;
                          return (
                            <SelectItem key={ip.id} value={ip.id} disabled={disabled}>
                              <div className="flex justify-between items-center w-full min-w-[200px]">
                                <div className="flex flex-col">
                                  <span className="font-mono">{ip.ipAddress}</span>
                                  {ip.remark && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{ip.remark}</span>}
                                </div>
                                <span className={`text-xs ml-2 ${disabled ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                  ({usage}/4 used)
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
           </div>

           <DialogFooter>
             <Button
                 variant="outline"
                 onClick={() => setIsSlotDialogOpen(false)}
                 data-testid="button-cancel-allocation"
             >
               Cancel
             </Button>
             <Button
                 onClick={handleCreateSlot}
                 disabled={createSlotMutation.isPending}
                 data-testid="button-confirm-allocation"
             >
               {createSlotMutation.isPending ? "Creating..." : "Confirm Allocation"}
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
     </Layout>
   );
 }

 function MetricCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
   return (
     <Card className={`shadow-sm border-l-4 ${color} bg-card/50 hover:shadow-md transition-shadow`}>
       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
         <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
         <Icon className="h-4 w-4 text-muted-foreground/70" />
       </CardHeader>
       <CardContent>
         <div className="text-2xl font-bold tracking-tight">{value}</div>
       </CardContent>
     </Card>
   );
 }
