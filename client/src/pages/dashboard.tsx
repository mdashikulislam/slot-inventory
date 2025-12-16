import React, { useState } from "react";
import Layout from "@/components/layout";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Smartphone, Network, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function Dashboard() {
  const { phones, ips, slots, getPhoneSlotUsage, getIpSlotUsage, addSlot } = useStore();
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [selectedIpId, setSelectedIpId] = useState<string>("");

  const handleCreateSlot = () => {
    if (!selectedPhoneId || !selectedIpId) {
      toast.error("Please select both a Phone and an IP Address");
      return;
    }
    
    const result = addSlot(selectedPhoneId, selectedIpId);
    if (result.success) {
      toast.success("Slot created successfully");
      setIsSlotDialogOpen(false);
      setSelectedPhoneId("");
      setSelectedIpId("");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of system resources and slot allocation.</p>
        </div>
        <Button onClick={() => setIsSlotDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
          <Link2 className="mr-2 h-4 w-4" />
          Create New Slot
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Phones</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phones.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active devices in system</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ips.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Proxies available</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slots Used</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slots.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Historical allocation count</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 h-[500px]">
        <Card className="col-span-1 shadow-sm flex flex-col h-full">
          <CardHeader>
            <CardTitle>Phone Utilization</CardTitle>
            <CardDescription>Slot usage per phone (Last 15 days)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-6 pb-6">
              <div className="space-y-6">
                {phones.map(phone => {
                  const usage = getPhoneSlotUsage(phone.id);
                  const remaining = 4 - usage;
                  const percentage = (usage / 4) * 100;
                  return (
                    <div key={phone.id} className="space-y-2">
                      <div className="flex items-end justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{phone.phoneNumber}</span>
                          <span className="text-xs text-muted-foreground">{phone.provider || "Unknown Provider"}</span>
                        </div>
                        <div className="text-right">
                          <span className={usage >= 4 ? "text-destructive font-bold block" : "text-foreground font-medium block"}>
                            {usage} Used
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {remaining} Remaining
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${usage >= 4 ? 'bg-destructive' : 'bg-primary'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {phones.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No phones added yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm flex flex-col h-full">
          <CardHeader>
            <CardTitle>IP Utilization</CardTitle>
            <CardDescription>Slot usage per IP (Last 15 days)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-6 pb-6">
              <div className="space-y-6">
                {ips.map(ip => {
                  const usage = getIpSlotUsage(ip.id);
                  const remaining = 4 - usage;
                  const percentage = (usage / 4) * 100;
                  return (
                    <div key={ip.id} className="space-y-2">
                      <div className="flex items-end justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{ip.ipAddress}</span>
                          <span className="text-xs text-muted-foreground">{ip.provider || "Unknown Provider"}</span>
                        </div>
                        <div className="text-right">
                          <span className={usage >= 4 ? "text-destructive font-bold block" : "text-foreground font-medium block"}>
                            {usage} Used
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {remaining} Remaining
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${usage >= 4 ? 'bg-destructive' : 'bg-primary'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {ips.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No IPs added yet.</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Slot Allocation</DialogTitle>
            <DialogDescription>
              Link a phone number to an IP address. Both must have available slots (less than 4 used in last 15 days).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                          <span className={`text-xs ml-2 ${disabled ? 'text-destructive' : 'text-muted-foreground'}`}>
                            ({usage}/4)
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
                          <span className={`text-xs ml-2 ${disabled ? 'text-destructive' : 'text-muted-foreground'}`}>
                            ({usage}/4)
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
            <Button onClick={handleCreateSlot}>Create Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
