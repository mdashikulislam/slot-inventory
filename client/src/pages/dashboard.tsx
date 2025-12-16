import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { useStore, Phone, IP } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Smartphone, Network, CheckCircle2, Search, Calendar as CalendarIcon, X, AlertTriangle } from "lucide-react";
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
        <div className="flex gap-2">
           <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search phones or IPs..." 
              className="pl-8 bg-background h-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsSlotDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md h-9">
            <Link2 className="mr-2 h-4 w-4" />
            Create Allocation
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs border-l-4 border-l-blue-500 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Phones</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPhones}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-indigo-500 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIps}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-green-500 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Phones</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availablePhones}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-teal-500 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available IPs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableIps}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 h-[600px]">
        {/* Compact Phone List */}
        <Card className="col-span-1 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/30 pb-2 py-2 border-b min-h-[48px] flex justify-center">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Phone Utilization
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal h-6">{filteredPhones.length} Devices</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10 shadow-sm">
                  <TableRow className="h-8 hover:bg-muted/10">
                    <TableHead className="w-[140px] text-xs h-8 font-semibold text-foreground/80">Phone Number</TableHead>
                    <TableHead className="text-xs h-8 font-semibold text-foreground/80">Provider</TableHead>
                    <TableHead className="text-xs text-right h-8 font-semibold text-foreground/80">Usage</TableHead>
                    <TableHead className="w-[40px] h-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhones.map(phone => {
                    const usage = getPhoneSlotUsage(phone.id);
                    const isOverLimit = usage >= 4;
                    const percentage = Math.min((usage / 4) * 100, 100);

                    return (
                      <TableRow 
                        key={phone.id} 
                        className="cursor-pointer hover:bg-muted/50 h-8 border-b border-muted/40 transition-colors"
                        onClick={() => setDetailPhone(phone)}
                      >
                        <TableCell className="font-medium text-xs py-0 h-8 align-middle">{phone.phoneNumber}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-0 h-8 align-middle truncate max-w-[100px]">{phone.provider || "-"}</TableCell>
                        <TableCell className="text-right py-0 h-8 align-middle">
                          <div className="flex items-center justify-end gap-2">
                             <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${percentage}%` }} />
                             </div>
                             <span className={`text-[10px] w-6 ${isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{usage}/4</span>
                          </div>
                        </TableCell>
                         <TableCell className="py-0 h-8 align-middle text-right pr-2">
                            <Search className="h-3 w-3 text-muted-foreground/50" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPhones.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                         No phones found.
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Compact IP List */}
        <Card className="col-span-1 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/30 pb-2 py-2 border-b min-h-[48px] flex justify-center">
            <div className="flex items-center justify-between w-full">
               <CardTitle className="text-base flex items-center gap-2">
                 <Network className="h-4 w-4" />
                 IP Utilization
               </CardTitle>
               <Badge variant="secondary" className="text-xs font-normal h-6">{filteredIps.length} IPs</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10 shadow-sm">
                  <TableRow className="h-8 hover:bg-muted/10">
                    <TableHead className="w-[140px] text-xs h-8 font-semibold text-foreground/80">IP Address</TableHead>
                    <TableHead className="text-xs h-8 font-semibold text-foreground/80">Provider</TableHead>
                    <TableHead className="text-xs text-right h-8 font-semibold text-foreground/80">Usage</TableHead>
                    <TableHead className="w-[40px] h-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIps.map(ip => {
                    const usage = getIpSlotUsage(ip.id);
                    const isOverLimit = usage >= 4;
                    const percentage = Math.min((usage / 4) * 100, 100);

                    return (
                      <TableRow 
                        key={ip.id} 
                        className="cursor-pointer hover:bg-muted/50 h-8 border-b border-muted/40 transition-colors"
                        onClick={() => setDetailIp(ip)}
                      >
                        <TableCell className="font-mono text-[11px] py-0 h-8 align-middle">{ip.ipAddress}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-0 h-8 align-middle truncate max-w-[100px]">{ip.provider || "-"}</TableCell>
                         <TableCell className="text-right py-0 h-8 align-middle">
                          <div className="flex items-center justify-end gap-2">
                             <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${percentage}%` }} />
                             </div>
                             <span className={`text-[10px] w-6 ${isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{usage}/4</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-0 h-8 align-middle text-right pr-2">
                            <Search className="h-3 w-3 text-muted-foreground/50" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredIps.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                         No IPs found.
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
            <DialogDescription>
              {detailPhone?.phoneNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
             <Table>
               <TableHeader>
                 <TableRow className="h-8">
                   <TableHead className="h-8 text-xs">IP Address</TableHead>
                   <TableHead className="h-8 text-xs">Date</TableHead>
                   <TableHead className="text-right h-8 text-xs">Slots</TableHead>
                   <TableHead className="w-[40px] h-8"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {detailPhone && slots.filter(s => s.phoneId === detailPhone.id).length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-xs">No active allocations</TableCell>
                   </TableRow>
                 )}
                 {detailPhone && slots
                   .filter(s => s.phoneId === detailPhone.id)
                   .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                   .map(slot => {
                     const ip = ips.find(i => i.id === slot.ipId);
                     return (
                       <TableRow key={slot.id} className="h-9">
                         <TableCell className="font-mono text-xs py-1">{ip?.ipAddress || "Unknown IP"}</TableCell>
                         <TableCell className="text-xs py-1">{format(new Date(slot.usedAt), "MMM d, yyyy")}</TableCell>
                         <TableCell className="text-right font-bold text-xs py-1">{slot.count || 1}</TableCell>
                         <TableCell className="py-1">
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                             <X className="h-3 w-3" />
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
            <DialogDescription>
              {detailIp?.ipAddress}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
             <Table>
               <TableHeader>
                 <TableRow className="h-8">
                   <TableHead className="h-8 text-xs">Phone Number</TableHead>
                   <TableHead className="h-8 text-xs">Date</TableHead>
                   <TableHead className="text-right h-8 text-xs">Slots</TableHead>
                   <TableHead className="w-[40px] h-8"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {detailIp && slots.filter(s => s.ipId === detailIp.id).length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-xs">No active allocations</TableCell>
                   </TableRow>
                 )}
                 {detailIp && slots
                   .filter(s => s.ipId === detailIp.id)
                   .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
                   .map(slot => {
                     const phone = phones.find(p => p.id === slot.phoneId);
                     return (
                       <TableRow key={slot.id} className="h-9">
                         <TableCell className="text-xs py-1">{phone?.phoneNumber || "Unknown Phone"}</TableCell>
                         <TableCell className="text-xs py-1">{format(new Date(slot.usedAt), "MMM d, yyyy")}</TableCell>
                         <TableCell className="text-right font-bold text-xs py-1">{slot.count || 1}</TableCell>
                         <TableCell className="py-1">
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                             <X className="h-3 w-3" />
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
