import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, Download, Search, CheckCircle, XCircle, X, Copy, Check, ChevronLeft, ChevronRight, ArrowUpDown, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIpSchema } from "@shared/schema";
import type { InsertIp, Ip } from "@shared/schema";
import { SLOT_LIMIT, getSlotCutoffDate, calculateTotalUsage, isAtCapacity, getRemainingSlots } from "@shared/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIps, useCreateIp, useUpdateIp, useDeleteIp, useSlots } from "@/hooks/use-data";

export default function IpsPage() {
  const { data: ips = [], isLoading } = useIps();
  const { data: slots = [] } = useSlots();
  const createIp = useCreateIp();
  const updateIp = useUpdateIp();
  const deleteIp = useDeleteIp();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [slotFilter, setSlotFilter] = useState<"all" | "0" | "1" | "2" | "3" | "4">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [computerFilter, setComputerFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'ipAddress' | 'usage'>('usage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const ITEMS_PER_PAGE = 10;

  const form = useForm<InsertIp>({
    resolver: zodResolver(insertIpSchema),
    defaultValues: {
      ipAddress: "",
      port: "9001",
      username: "ashik",
      password: "11224411",
      provider: "",
      remark: "",
      computer: "",
    },
  });

  const onSubmit = async (data: InsertIp) => {
    try {
      if (editingId) {
        await updateIp.mutateAsync({ id: editingId, data });
        toast.success("IP updated successfully");
      } else {
        await createIp.mutateAsync(data);
        toast.success("IP added successfully");
      }
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (ip: Ip) => {
    setEditingId(ip.id);
    form.reset({
      ipAddress: ip.ipAddress,
      port: ip.port || "9001",
      username: ip.username || "ashik",
      password: ip.password || "11224411",
      provider: ip.provider || "",
      remark: ip.remark || "",
      computer: ip.computer || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this IP? All associated slots will be removed.")) {
      try {
        await deleteIp.mutateAsync(id);
        toast.success("IP deleted");
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    form.reset({
      ipAddress: "",
      port: "9001",
      username: "ashik",
      password: "11224411",
      provider: "",
      remark: "",
      computer: "",
    });
    setIsDialogOpen(true);
  };

  const getIpSlotUsage = (ipId: string) => {
    const cutoffDate = getSlotCutoffDate();
    
    const relevantSlots = slots.filter(s => 
      s.ipId === ipId && 
      new Date(s.usedAt) >= cutoffDate
    );
    
    return calculateTotalUsage(relevantSlots);
  };

  // Copy to clipboard - format: ip:port:username:password
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

  // Toggle individual checkbox
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle all checkboxes
  const toggleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    if (checked) {
      paginatedIps.forEach(ip => {
        newSelected[ip.id] = true;
      });
    }
    setSelectedIds(newSelected);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const selectedCount = Object.values(selectedIds).filter(Boolean).length;
    if (selectedCount === 0) {
      toast.error("No IPs selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCount} IP(s)? All associated slots will be removed.`)) {
      return;
    }

    try {
      const deletePromises = Object.keys(selectedIds)
        .filter(id => selectedIds[id])
        .map(id => deleteIp.mutateAsync(id));
      
      await Promise.all(deletePromises);
      toast.success(`Deleted ${selectedCount} IP(s)`);
      setSelectedIds({});
    } catch (error: any) {
      toast.error("Failed to delete some IPs");
    }
  };

  // Sort toggle
  const toggleSort = (field: 'ipAddress' | 'usage') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique providers
  const uniqueProviders = useMemo(() => {
    const providers = new Set<string>();
    ips.forEach(ip => {
      if (ip.provider) providers.add(ip.provider);
    });
    return Array.from(providers).sort();
  }, [ips]);

  const filteredIps = useMemo(() => {
    return ips.filter(ip => {
      const matchesSearch = 
        ip.ipAddress.includes(searchQuery) || 
        ip.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ip.remark?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const usage = getIpSlotUsage(ip.id);
      
      const matchesSlot = slotFilter === 'all' || 
        (slotFilter === '4' ? usage >= 4 : usage === parseInt(slotFilter, 10));
      
      const matchesProvider = providerFilter === 'all' || ip.provider === providerFilter;
      
      const matchesComputer = computerFilter === 'all' || ip.computer === computerFilter;

      return matchesSearch && matchesSlot && matchesProvider && matchesComputer;
    }).sort((a, b) => {
      if (sortField === 'ipAddress') {
        const comparison = a.ipAddress.localeCompare(b.ipAddress);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const ua = getIpSlotUsage(a.id);
        const ub = getIpSlotUsage(b.id);
        const comparison = ua - ub;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });
  }, [ips, searchQuery, slotFilter, providerFilter, computerFilter, slots, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredIps.length / ITEMS_PER_PAGE);
  const paginatedIps = filteredIps.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, slotFilter, providerFilter, computerFilter]);

  const handleExport = () => {
    const lines = filteredIps.map(ip => {
      const parts = [
        ip.ipAddress,
        ip.port || "",
        ip.username || "",
        ip.password || ""
      ];
      return parts.join(":");
    });

    const txtContent = lines.join("\n");

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ips_export_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredIps.length} IPs to TXT`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent" data-testid="heading-ips">IP Address Management</h1>
          <p className="text-muted-foreground mt-1">Manage proxies and IP addresses.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {Object.values(selectedIds).some(Boolean) && (
            <Button 
              onClick={handleBulkDelete} 
              variant="destructive" 
              className="cursor-pointer"
            >
              <Trash className="mr-2 h-4 w-4" /> 
              Delete Selected ({Object.values(selectedIds).filter(Boolean).length})
            </Button>
          )}
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer" data-testid="button-add-ip">
            <Plus className="mr-2 h-4 w-4" /> Add IP
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Network Resources</CardTitle>
              <Button variant="outline" onClick={handleExport} title="Export TXT" className="cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export .txt
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search IPs..." 
                  className="pl-9 pr-9 h-9" 
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
              <Select value={slotFilter} onValueChange={(v) => setSlotFilter(v as any)}>
                <SelectTrigger className="h-9 w-full sm:w-32 cursor-pointer">
                  <SelectValue placeholder="Slots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  <SelectItem value="0">0 Used</SelectItem>
                  <SelectItem value="1">1 Used</SelectItem>
                  <SelectItem value="2">2 Used</SelectItem>
                  <SelectItem value="3">3 Used</SelectItem>
                  <SelectItem value="4">4 Used</SelectItem>
                </SelectContent>
              </Select>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="h-9 w-full sm:w-40 cursor-pointer">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {uniqueProviders.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={computerFilter} onValueChange={setComputerFilter}>
                <SelectTrigger className="h-9 w-full sm:w-40 cursor-pointer">
                  <SelectValue placeholder="All Computers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Computers</SelectItem>
                  <SelectItem value="Computer 1">Computer 1</SelectItem>
                  <SelectItem value="Computer 2">Computer 2</SelectItem>
                  <SelectItem value="Computer 3">Computer 3</SelectItem>
                  <SelectItem value="Computer 4">Computer 4</SelectItem>
                  <SelectItem value="Computer 5">Computer 5</SelectItem>
                  <SelectItem value="Computer 6">Computer 6</SelectItem>
                  <SelectItem value="Computer 7">Computer 7</SelectItem>
                  <SelectItem value="Computer 8">Computer 8</SelectItem>
                  <SelectItem value="Computer 9">Computer 9</SelectItem>
                  <SelectItem value="Computer 10">Computer 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={paginatedIps.length > 0 && paginatedIps.every(ip => selectedIds[ip.id])}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('ipAddress')}>
                  <div className="flex items-center gap-2">
                    IP Address
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Computer</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('usage')}>
                  <div className="flex items-center gap-2">
                    Slots Used (15d)
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedIps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 opacity-20" />
                      <p>{searchQuery || slotFilter !== 'all' || providerFilter !== 'all' ? 'No IPs match your filters.' : 'No IPs found. Click "Add IP" to create one.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedIps.map((ip) => {
                  const usage = getIpSlotUsage(ip.id);
                  const remaining = getRemainingSlots(usage);
                  return (
                    <TableRow key={ip.id} className="group" data-testid={`row-ip-${ip.id}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={!!selectedIds[ip.id]}
                          onChange={() => toggleSelect(ip.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${ip.ipAddress}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs md:text-sm" data-testid={`text-ip-${ip.id}`}>{ip.ipAddress}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => {
                              const copyText = `${ip.ipAddress}:${ip.port || ''}:${ip.username || ''}:${ip.password || ''}`;
                              copyToClipboard(copyText, `ip-${ip.id}`);
                            }}
                          >
                            {copiedId === `ip-${ip.id}` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm" data-testid={`text-port-${ip.id}`}>{ip.port || "-"}</TableCell>
                      <TableCell data-testid={`text-provider-${ip.id}`}>{ip.provider || "-"}</TableCell>
                      <TableCell data-testid={`text-computer-${ip.id}`}>{ip.computer || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            remaining === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            remaining >= 1 && remaining <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`} data-testid={`badge-usage-${ip.id}`}>
                            {usage} / {SLOT_LIMIT}
                          </span>
                          <span className="text-xs text-muted-foreground">({remaining} left)</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" data-testid={`text-remark-${ip.id}`}>{ip.remark || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" data-testid={`button-menu-${ip.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(ip)} className="cursor-pointer" data-testid={`button-edit-${ip.id}`}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(ip.id)} className="text-destructive focus:text-destructive cursor-pointer" data-testid={`button-delete-${ip.id}`}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {filteredIps.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredIps.length)} of {filteredIps.length} IPs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit IP Address" : "Add New IP"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ipAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IP Address <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.1" className="font-mono" {...field} data-testid="input-ip-address" required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="8080" className="font-mono" {...field} data-testid="input-port" required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="proxy-user" {...field} value={field.value ?? ""} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} value={field.value ?? ""} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. AWS" {...field} value={field.value ?? ""} data-testid="input-provider" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="computer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Computer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-computer">
                          <SelectValue placeholder="Select computer (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="Computer 1">Computer 1</SelectItem>
                        <SelectItem value="Computer 2">Computer 2</SelectItem>
                        <SelectItem value="Computer 3">Computer 3</SelectItem>
                        <SelectItem value="Computer 4">Computer 4</SelectItem>
                        <SelectItem value="Computer 5">Computer 5</SelectItem>
                        <SelectItem value="Computer 6">Computer 6</SelectItem>
                        <SelectItem value="Computer 7">Computer 7</SelectItem>
                        <SelectItem value="Computer 8">Computer 8</SelectItem>
                        <SelectItem value="Computer 9">Computer 9</SelectItem>
                        <SelectItem value="Computer 10">Computer 10</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes..." {...field} value={field.value ?? ""} data-testid="input-remark" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="cursor-pointer" data-testid="button-cancel">Cancel</Button>
                <Button type="submit" disabled={createIp.isPending || updateIp.isPending} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 cursor-pointer" data-testid="button-submit">
                  {createIp.isPending || updateIp.isPending ? "Saving..." : editingId ? "Save Changes" : "Add IP"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
