import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPhoneSchema } from "@shared/schema";
import type { InsertPhone, Phone } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePhones, useCreatePhone, useUpdatePhone, useDeletePhone, usePhoneSlotUsage } from "@/hooks/use-data";
import { useSlots } from "@/hooks/use-data";

export default function PhonesPage() {
  const { data: phones = [], isLoading } = usePhones();
  const { data: slots = [] } = useSlots();
  const createPhone = useCreatePhone();
  const updatePhone = useUpdatePhone();
  const deletePhone = useDeletePhone();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<InsertPhone>({
    resolver: zodResolver(insertPhoneSchema),
    defaultValues: {
      phoneNumber: "",
      email: "",
      remark: "",
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
    });
    setIsDialogOpen(true);
  };

  const getPhoneSlotUsage = (phoneId: string) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    
    return slots
      .filter(s => s.phoneId === phoneId && new Date(s.usedAt) > cutoff)
      .reduce((acc, curr) => acc + (curr.count || 1), 0);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-phones">Phones Management</h1>
          <p className="text-muted-foreground mt-1">Add, edit, and manage phone numbers in the system.</p>
        </div>
        <Button onClick={openAddDialog} className="bg-primary text-primary-foreground" data-testid="button-add-phone">
          <Plus className="mr-2 h-4 w-4" /> Add Phone
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Slots Used (15d)</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No phones found. Click "Add Phone" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                phones.map((phone) => {
                   const usage = getPhoneSlotUsage(phone.id);
                   return (
                    <TableRow key={phone.id} data-testid={`row-phone-${phone.id}`}>
                      <TableCell className="font-medium" data-testid={`text-phone-number-${phone.id}`}>{phone.phoneNumber}</TableCell>
                      <TableCell data-testid={`text-email-${phone.id}`}>{phone.email || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          usage >= 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`} data-testid={`badge-usage-${phone.id}`}>
                          {usage} / 4
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" data-testid={`text-remark-${phone.id}`}>{phone.remark || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-menu-${phone.id}`}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(phone)} data-testid={`button-edit-${phone.id}`}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(phone.id)} className="text-destructive focus:text-destructive" data-testid={`button-delete-${phone.id}`}>
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
                      <Input placeholder="+1234567890" {...field} data-testid="input-phone-number" />
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
                      <Input placeholder="user@example.com" {...field} data-testid="input-email" />
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
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">Cancel</Button>
                <Button type="submit" disabled={createPhone.isPending || updatePhone.isPending} data-testid="button-submit">
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
