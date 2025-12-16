import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, Download, Search, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIpSchema } from "@shared/schema";
import type { InsertIp, Ip } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const [filterType, setFilterType] = useState<"all" | "available">("all");

  const form = useForm<InsertIp>({
    resolver: zodResolver(insertIpSchema),
    defaultValues: {
      ipAddress: "",
      port: "9001",
      username: "ashik",
      password: "11224411",
      provider: "",
      remark: "",
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
    });
    setIsDialogOpen(true);
  };

  const getIpSlotUsage = (ipId: string) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    
    return slots
      .filter(s => s.ipId === ipId && new Date(s.usedAt) > cutoff)
      .reduce((acc, curr) => acc + (curr.count || 1), 0);
  };

  const filteredIps = useMemo(() => {
    return ips.filter(ip => {
      const matchesSearch = 
        ip.ipAddress.includes(searchQuery) || 
        ip.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ip.remark?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const usage = getIpSlotUsage(ip.id);
      const matchesFilter = filterType === "all" || (filterType === "available" && usage < 4);

      return matchesSearch && matchesFilter;
    });
  }, [ips, searchQuery, filterType, slots]);

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
    link.setAttribute("download", `ips_export_${filterType}_${new Date().toISOString().split('T')[0]}.txt`);
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
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-ips">IP Address Management</h1>
          <p className="text-muted-foreground mt-1">Manage proxies and IP addresses.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={openAddDialog} className="bg-primary text-primary-foreground" data-testid="button-add-ip">
            <Plus className="mr-2 h-4 w-4" /> Add IP
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-muted">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Network Resources</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search IPs..." 
                  className="pl-8" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <ToggleGroup type="single" value={filterType} onValueChange={(v) => v && setFilterType(v as any)} className="justify-start">
                <ToggleGroupItem value="all" aria-label="All IPs" data-testid="toggle-all">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="available" aria-label="Available IPs" data-testid="toggle-available">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Available
                </ToggleGroupItem>
              </ToggleGroup>
              <Button variant="outline" onClick={handleExport} title="Export TXT" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export .txt
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Slots Used (15d)</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 opacity-20" />
                      <p>No IPs found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredIps.map((ip) => {
                  const usage = getIpSlotUsage(ip.id);
                  const isFull = usage >= 4;
                  return (
                    <TableRow key={ip.id} className={isFull ? "bg-muted/10" : ""} data-testid={`row-ip-${ip.id}`}>
                      <TableCell className="font-medium font-mono text-xs md:text-sm" data-testid={`text-ip-${ip.id}`}>
                        <div className="flex items-center gap-2">
                          {isFull ? <XCircle className="h-3 w-3 text-red-500" /> : <CheckCircle className="h-3 w-3 text-green-500" />}
                          {ip.ipAddress}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm" data-testid={`text-port-${ip.id}`}>{ip.port || "-"}</TableCell>
                      <TableCell data-testid={`text-provider-${ip.id}`}>{ip.provider || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isFull ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`} data-testid={`badge-usage-${ip.id}`}>
                          {usage} / 4
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" data-testid={`text-remark-${ip.id}`}>{ip.remark || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-${ip.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(ip)} data-testid={`button-edit-${ip.id}`}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(ip.id)} className="text-destructive focus:text-destructive" data-testid={`button-delete-${ip.id}`}>
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">Cancel</Button>
                <Button type="submit" disabled={createIp.isPending || updateIp.isPending} data-testid="button-submit">
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
