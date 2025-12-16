import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { useStore, Phone, IP } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Smartphone, Network, CheckCircle2, Search, Calendar as CalendarIcon, X, MoreHorizontal, ArrowUpRight, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { phones, ips, slots, getPhoneSlotUsage, getIpSlotUsage, addSlot, deleteSlot } = useStore();
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  
  // Details Dialog State
  const [detailPhone, setDetailPhone] = useState<Phone | null>(null);
  const [detailIp, setDetailIp] = useState<IP | null>(null);
  
  // Slot Creation State
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [selectedIpId, setSelectedIpId] = useState<string>("");
  const [slotCount, setSlotCount] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Dashboard Filters
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateSlot = () => {
    if (!selectedPhoneId || !selectedIpId || !selectedDate) {
      toast.error("Please fill in all fields");
      return;
    }
    
    const result = addSlot(selectedPhoneId, selectedIpId, slotCount, selectedDate);
    if (result.success) {
      toast.success("Slot allocation created successfully");
      setIsSlotDialogOpen(false);
      // Reset form
      setSelectedPhoneId("");
      setSelectedIpId("");
      setSlotCount(1);
      setSelectedDate(new Date());
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("Are you sure you want to remove this slot allocation?")) {
      deleteSlot(id);
      toast.success("Slot removed");
    }
  };

  const filteredPhones = useMemo(() => {
    return phones.filter(p => 
      p.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [phones, searchQuery]);

  const filteredIps = useMemo(() => {
    return ips.filter(i => 
      i.ipAddress.includes(searchQuery) ||
      i.provider?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ips, searchQuery]);

  // Metrics
  const totalPhones = phones.length;
  const totalIps = ips.length;
  const availablePhones = phones.filter(p => getPhoneSlotUsage(p.id) < 4).length;
  const availableIps = ips.filter(i => getIpSlotUsage(i.id) < 4).length;

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
            />
          </div>
          <Button onClick={() => setIsSlotDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-9">
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
              <Badge variant="outline" className="bg-background font-mono text-xs">{filteredPhones.length} Devices</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[180px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-6">Device</TableHead>
                    <TableHead className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Provider</TableHead>
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
                      >
                        <TableCell className="pl-6 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono text-foreground/90 group-hover:text-primary transition-colors">{phone.phoneNumber}</span>
                            {phone.remark && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{phone.remark}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                           <Badge variant="secondary" className="font-normal text-[10px] text-muted-foreground/80 bg-muted/50 hover:bg-muted border-0">
                            {phone.provider || "N/A"}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex flex-col items-end gap-1.5">
                             <div className="flex items-center gap-2 text-xs">
                                <span className={isFull ? "text-destructive font-bold" : "text-muted-foreground font-medium"}>
                                  {usage} <span className="text-muted-foreground/50 font-normal">/ 4</span>
                                </span>
                             </div>
                             <Progress 
                                value={percentage} 
                                className={`h-1.5 w-24 bg-muted ${isFull ? '[&>div]:bg-destructive' : '[&>div]:bg-blue-500'}`} 
                              />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPhones.length === 0 && (
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
               <Badge variant="outline" className="bg-background font-mono text-xs">{filteredIps.length} IPs</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[180px] h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-6">IP Address</TableHead>
                    <TableHead className="h-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Provider</TableHead>
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
                        onClick={() => setDetailIp(ip)}
                      >
                        <TableCell className="pl-6">
                           <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono text-foreground/90 group-hover:text-primary transition-colors">{ip.ipAddress}</span>
                            {ip.remark && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{ip.remark}</span>}
                           </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-[10px] text-muted-foreground/80 bg-muted/50 hover:bg-muted border-0">
                            {ip.provider || "N/A"}
                           </Badge>
                        </TableCell>
                         <TableCell className="text-right pr-6">
                          <div className="flex flex-col items-end gap-1.5">
                             <div className="flex items-center gap-2 text-xs">
                                <span className={isFull ? "text-destructive font-bold" : "text-muted-foreground font-medium"}>
                                  {usage} <span className="text-muted-foreground/50 font-normal">/ 4</span>
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
                       <TableCell colSpan={3} className="h-32 text-center">
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Allocation</DialogTitle>
            <DialogDescription>
              Allocate slots for a Phone and IP pair. STRICT LIMIT enforced (Max 4 slots / 15 days).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label>Allocation Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-full justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="count">Slot Count</Label>
                <Input 
                  id="count" 
                  type="number" 
                  min="1" 
                  value={slotCount} 
                  onChange={(e) => setSlotCount(parseInt(e.target.value) || 1)} 
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Select Phone</Label>
              <Select onValueChange={setSelectedPhoneId} value={selectedPhoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a phone..." />
                </SelectTrigger>
                <SelectContent>
                  {phones.map(phone => {
                    const usage = getPhoneSlotUsage(phone.id);
                    const disabled = usage >= 4;
                    return (
                      <SelectItem key={phone.id} value={phone.id} disabled={disabled}>
                        <div className="flex justify-between items-center w-full min-w-[200px]">
                          <span>{phone.phoneNumber}</span>
                          <span className={`text-xs ml-2 ${disabled ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            ({usage}/4 used)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ip">Select IP Address</Label>
              <Select onValueChange={setSelectedIpId} value={selectedIpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an IP..." />
                </SelectTrigger>
                <SelectContent>
                  {ips.map(ip => {
                    const usage = getIpSlotUsage(ip.id);
                    const disabled = usage >= 4;
                    return (
                      <SelectItem key={ip.id} value={ip.id} disabled={disabled}>
                         <div className="flex justify-between items-center w-full min-w-[200px]">
                          <span>{ip.ipAddress}</span>
                          <span className={`text-xs ml-2 ${disabled ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            ({usage}/4 used)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSlotDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSlot}>Confirm Allocation</Button>
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
                   <TableHead className="h-8 text-xs font-semibold">IP Address</TableHead>
                   <TableHead className="h-8 text-xs font-semibold">Date</TableHead>
                   <TableHead className="text-right h-8 text-xs font-semibold">Slots</TableHead>
                   <TableHead className="w-[40px] h-8"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {detailPhone && slots.filter(s => s.phoneId === detailPhone.id).length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">No active allocations</TableCell>
                   </TableRow>
                 )}
                 {detailPhone && slots
                   .filter(s => s.phoneId === detailPhone.id)
                   .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                   .map(slot => {
                     const ip = ips.find(i => i.id === slot.ipId);
                     return (
                       <TableRow key={slot.id} className="h-10 hover:bg-muted/30">
                         <TableCell className="font-mono text-xs py-1 text-foreground/80">{ip?.ipAddress || "Unknown IP"}</TableCell>
                         <TableCell className="text-xs py-1 text-muted-foreground">{format(new Date(slot.usedAt), "MMM d, yyyy")}</TableCell>
                         <TableCell className="text-right font-medium text-xs py-1">{slot.count || 1}</TableCell>
                         <TableCell className="py-1">
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSlot(slot.id)}>
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
          <div className="py-2">
             <Table>
               <TableHeader>
                 <TableRow className="h-8 hover:bg-transparent">
                   <TableHead className="h-8 text-xs font-semibold">Phone Number</TableHead>
                   <TableHead className="h-8 text-xs font-semibold">Date</TableHead>
                   <TableHead className="text-right h-8 text-xs font-semibold">Slots</TableHead>
                   <TableHead className="w-[40px] h-8"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {detailIp && slots.filter(s => s.ipId === detailIp.id).length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">No active allocations</TableCell>
                   </TableRow>
                 )}
                 {detailIp && slots
                   .filter(s => s.ipId === detailIp.id)
                   .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                   .map(slot => {
                     const phone = phones.find(p => p.id === slot.phoneId);
                     return (
                       <TableRow key={slot.id} className="h-10 hover:bg-muted/30">
                         <TableCell className="text-xs py-1 font-medium font-mono text-foreground/80">{phone?.phoneNumber || "Unknown Phone"}</TableCell>
                         <TableCell className="text-xs py-1 text-muted-foreground">{format(new Date(slot.usedAt), "MMM d, yyyy")}</TableCell>
                         <TableCell className="text-right font-medium text-xs py-1">{slot.count || 1}</TableCell>
                         <TableCell className="py-1">
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSlot(slot.id)}>
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
