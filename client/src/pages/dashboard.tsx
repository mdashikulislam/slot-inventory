import React, { useState, useMemo } from "react";
import Layout from "@/components/layout";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Smartphone, Network, CheckCircle2, Search, Calendar as CalendarIcon, Filter } from "lucide-react";
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

export default function Dashboard() {
  const { phones, ips, slots, getPhoneSlotUsage, getIpSlotUsage, addSlot } = useStore();
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  
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

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of system resources and slot allocation.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search phones or IPs..." 
              className="pl-8 bg-background" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsSlotDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
            <Link2 className="mr-2 h-4 w-4" />
            Create Allocation
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Phones</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phones.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active devices</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ips.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Proxies available</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slots Used</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {slots.reduce((acc, curr) => acc + (curr.count || 1), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total allocation count</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground mt-1">Operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 h-[600px]">
        <Card className="col-span-1 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Phone Utilization</CardTitle>
                <CardDescription>Usage per phone (Last 15 days)</CardDescription>
              </div>
              <Badge variant="outline" className="bg-background">{filteredPhones.length} Devices</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="divide-y divide-border">
                {filteredPhones.map(phone => {
                  const usage = getPhoneSlotUsage(phone.id);
                  const percentage = Math.min((usage / 4) * 100, 100);
                  const isOverLimit = usage >= 4;
                  
                  // Get last used date
                  const lastSlot = slots
                    .filter(s => s.phoneId === phone.id)
                    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())[0];

                  return (
                    <div key={phone.id} className="p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm">{phone.phoneNumber}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{phone.provider || "Unknown Provider"}</span>
                            {lastSlot && (
                              <>
                                <span>•</span>
                                <span>Last: {format(new Date(lastSlot.usedAt), "MMM d")}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${isOverLimit ? "text-destructive" : "text-foreground"}`}>
                            {usage} Used
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {filteredPhones.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Smartphone className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No phones found matching your search.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <div className="flex items-center justify-between">
               <div>
                <CardTitle>IP Utilization</CardTitle>
                <CardDescription>Usage per IP (Last 15 days)</CardDescription>
              </div>
              <Badge variant="outline" className="bg-background">{filteredIps.length} IPs</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full">
              <div className="divide-y divide-border">
                {filteredIps.map(ip => {
                  const usage = getIpSlotUsage(ip.id);
                  const percentage = Math.min((usage / 4) * 100, 100);
                  const isOverLimit = usage >= 4;

                  // Get last used date
                  const lastSlot = slots
                    .filter(s => s.ipId === ip.id)
                    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())[0];

                  return (
                    <div key={ip.id} className="p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm font-mono">{ip.ipAddress}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{ip.provider || "Unknown Provider"}</span>
                             {lastSlot && (
                              <>
                                <span>•</span>
                                <span>Last: {format(new Date(lastSlot.usedAt), "MMM d")}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-bold ${isOverLimit ? "text-destructive" : "text-foreground"}`}>
                            {usage} Used
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                 {filteredIps.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Network className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No IPs found matching your search.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Allocation</DialogTitle>
            <DialogDescription>
              Allocate slots for a Phone and IP pair. Overriding limits is permitted.
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
                    return (
                      <SelectItem key={phone.id} value={phone.id}>
                        <div className="flex justify-between items-center w-full min-w-[200px]">
                          <span>{phone.phoneNumber}</span>
                          <span className={`text-xs ml-2 ${usage >= 4 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            ({usage} used)
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
                    return (
                      <SelectItem key={ip.id} value={ip.id}>
                         <div className="flex justify-between items-center w-full min-w-[200px]">
                          <span>{ip.ipAddress}</span>
                          <span className={`text-xs ml-2 ${usage >= 4 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                            ({usage} used)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {(selectedPhoneId || selectedIpId) && (
              <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>
                  Allocation will add <strong>{slotCount}</strong> slot(s) to the selected resources.
                  Limits are monitored but not blocked.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSlotDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSlot}>Confirm Allocation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
