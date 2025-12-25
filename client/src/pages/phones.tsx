import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2, Search, X, Copy, Check, ChevronLeft, ChevronRight, ArrowUpDown, Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPhoneSchema } from "@shared/schema";
import type { InsertPhone, Phone } from "@shared/schema";
import { SLOT_LIMIT, getSlotCutoffDate, calculateTotalUsage, isAtCapacity, getRemainingSlots } from "@shared/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePhones, useCreatePhone, useUpdatePhone, useDeletePhone } from "@/hooks/use-data";
import { useSlots } from "@/hooks/use-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PhonesPage() {
  const { data: phones = [], isLoading } = usePhones();
  const { data: slots = [] } = useSlots();
  const createPhone = useCreatePhone();
  const updatePhone = useUpdatePhone();
  const deletePhone = useDeletePhone();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [slotFilter, setSlotFilter] = useState<"all" | "0" | "1" | "2" | "3" | "4">("all");
  const [computerFilter, setComputerFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<'phoneNumber' | 'usage'>('usage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const ITEMS_PER_PAGE = 10;

  const form = useForm<InsertPhone>({
    resolver: zodResolver(insertPhoneSchema),
    defaultValues: {
      phoneNumber: "",
      email: "",
      remark: "",
      computer: "",
    },
  });

  const onSubmit = async (data: InsertPhone) => {
    try {
      if (editingId) {
        await updatePhone.mutateAsync({ id: editingId, data });
        toast.success("Phone updated successfully");
      } else {
        await createPhone.mutateAsync(data);
        toast.success("Phone added successfully");
      }
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (phone: Phone) => {
    setEditingId(phone.id);
    form.reset({
      phoneNumber: phone.phoneNumber,
      email: phone.email,
      remark: phone.remark || "",
      computer: phone.computer || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this phone? All associated slots will be removed.")) {
      try {
        await deletePhone.mutateAsync(id);
        toast.success("Phone deleted");
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    form.reset({
      phoneNumber: "",
      email: "",
      remark: "",
      computer: "",
    });
    setIsDialogOpen(true);
  };

  const getPhoneSlotUsage = (phoneId: string) => {
    const cutoffDate = getSlotCutoffDate();
    
    const relevantSlots = slots.filter(s => 
      s.phoneId === phoneId && 
      new Date(s.usedAt) >= cutoffDate
    );
    
    return calculateTotalUsage(relevantSlots);
  };

  // Copy to clipboard
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
      paginatedPhones.forEach(phone => {
        newSelected[phone.id] = true;
      });
    }
    setSelectedIds(newSelected);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const selectedCount = Object.values(selectedIds).filter(Boolean).length;
    if (selectedCount === 0) {
      toast.error("No phones selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCount} phone(s)? All associated slots will be removed.`)) {
      return;
    }

    try {
      const deletePromises = Object.keys(selectedIds)
        .filter(id => selectedIds[id])
        .map(id => deletePhone.mutateAsync(id));
      
      await Promise.all(deletePromises);
      toast.success(`Deleted ${selectedCount} phone(s)`);
      setSelectedIds({});
    } catch (error: any) {
      toast.error("Failed to delete some phones");
    }
  };

  // Sort toggle
  const toggleSort = (field: 'phoneNumber' | 'usage') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and paginated phones
  const filteredPhones = useMemo(() => {
    if (!phones) return [];
    return phones
      .filter(p =>
        p.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.remark?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter(p => {
        if (slotFilter === 'all') return true;
        const usage = getPhoneSlotUsage(p.id);
        if (slotFilter === '4') return usage >= 4;
        return usage === parseInt(slotFilter, 10);
      })
      .filter(p => {
        if (computerFilter === 'all') return true;
        return p.computer === computerFilter;
      })
      .sort((a, b) => {
        if (sortField === 'phoneNumber') {
          const comparison = a.phoneNumber.localeCompare(b.phoneNumber);
          return sortDirection === 'asc' ? comparison : -comparison;
        } else {
          const ua = getPhoneSlotUsage(a.id);
          const ub = getPhoneSlotUsage(b.id);
          const comparison = ua - ub;
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
  }, [phones, searchQuery, slotFilter, computerFilter, slots, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredPhones.length / ITEMS_PER_PAGE);
  const paginatedPhones = filteredPhones.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, slotFilter, computerFilter]);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" data-testid="heading-phones">Phones Management</h1>
          <p className="text-muted-foreground mt-1">Add, edit, and manage phone numbers in the system.</p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer" data-testid="button-add-phone">
            <Plus className="mr-2 h-4 w-4" /> Add Phone
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Registered Devices</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search phones..." 
                  className="pl-9 pr-9 h-9 border-slate-200 focus:border-blue-500" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <SelectValue placeholder="All Slots" />
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
                    checked={paginatedPhones.length > 0 && paginatedPhones.every(p => selectedIds[p.id])}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('phoneNumber')}>
                  <div className="flex items-center gap-2">
                    Phone Number
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Email</TableHead>
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
              {paginatedPhones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || slotFilter !== 'all' ? 'No phones match your filters.' : 'No phones found. Click "Add Phone" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPhones.map((phone) => {
                   const usage = getPhoneSlotUsage(phone.id);
                   const remaining = getRemainingSlots(usage);
                   return (
                    <TableRow key={phone.id} className="group" data-testid={`row-phone-${phone.id}`}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={!!selectedIds[phone.id]}
                          onChange={() => toggleSelect(phone.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${phone.phoneNumber}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono" data-testid={`text-phone-number-${phone.id}`}>{phone.phoneNumber}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => copyToClipboard(phone.phoneNumber, `phone-${phone.id}`)}
                          >
                            {copiedId === `phone-${phone.id}` ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-email-${phone.id}`}>{phone.email || "-"}</TableCell>
                      <TableCell data-testid={`text-computer-${phone.id}`}>{phone.computer || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            remaining === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            remaining >= 1 && remaining <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`} data-testid={`badge-usage-${phone.id}`}>
                            {usage} / {SLOT_LIMIT}
                          </span>
                          <span className="text-xs text-muted-foreground">({remaining} left)</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" data-testid={`text-remark-${phone.id}`}>{phone.remark || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" data-testid={`button-menu-${phone.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(phone)} className="cursor-pointer" data-testid={`button-edit-${phone.id}`}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(phone.id)} className="text-destructive focus:text-destructive cursor-pointer" data-testid={`button-delete-${phone.id}`}>
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
          {filteredPhones.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPhones.length)} of {filteredPhones.length} phones
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Phone" : "Add New Phone"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} value={field.value ?? ""} data-testid="input-phone-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} value={field.value ?? ""} data-testid="input-email" />
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
                      <Input placeholder="Optional notes..." {...field} value={field.value || ""} data-testid="input-remark" />
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
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="cursor-pointer" data-testid="button-cancel">Cancel</Button>
                <Button type="submit" disabled={createPhone.isPending || updatePhone.isPending} className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 cursor-pointer" data-testid="button-submit">
                  {createPhone.isPending || updatePhone.isPending ? "Saving..." : editingId ? "Save Changes" : "Add Phone"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
