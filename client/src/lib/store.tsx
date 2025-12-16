import React, { createContext, useContext, useState, useEffect } from "react";
import { subDays, isAfter, parseISO } from "date-fns";
import { nanoid } from "nanoid";

// --- Types ---

export interface Phone {
  id: string;
  phoneNumber: string;
  email: string;
  provider?: string;
  remark?: string;
  createdAt: string;
}

export interface IP {
  id: string;
  ipAddress: string;
  port?: string;
  username?: string;
  password?: string;
  provider?: string;
  remark?: string;
  createdAt: string;
}

export interface Slot {
  id: string;
  phoneId: string;
  ipId: string;
  count: number; // Added count field
  usedAt: string;
}

interface AppState {
  phones: Phone[];
  ips: IP[];
  slots: Slot[];
  isAuthenticated: boolean;
}

interface StoreContextType extends AppState {
  addPhone: (phone: Omit<Phone, "id" | "createdAt">) => void;
  updatePhone: (id: string, phone: Partial<Phone>) => void;
  deletePhone: (id: string) => void;
  addIp: (ip: Omit<IP, "id" | "createdAt">) => void;
  updateIp: (id: string, ip: Partial<IP>) => void;
  deleteIp: (id: string) => void;
  addSlot: (phoneId: string, ipId: string, count: number, date: Date) => { success: boolean; error?: string };
  getPhoneSlotUsage: (phoneId: string) => number;
  getIpSlotUsage: (ipId: string) => number;
  resetData: () => void;
  login: () => void;
  logout: () => void;
}

// --- Initial Data for Demo ---

const INITIAL_STATE: AppState = {
  phones: [
    { id: "p1", phoneNumber: "+15550101", email: "demo1@example.com", provider: "Verizon", remark: "Primary demo phone", createdAt: new Date().toISOString() },
    { id: "p2", phoneNumber: "+15550102", email: "demo2@example.com", provider: "AT&T", remark: "", createdAt: new Date().toISOString() },
  ],
  ips: [
    { id: "i1", ipAddress: "192.168.1.101", provider: "AWS", remark: "US East Proxy", createdAt: new Date().toISOString() },
    { id: "i2", ipAddress: "192.168.1.102", provider: "DigitalOcean", remark: "Backup Proxy", createdAt: new Date().toISOString() },
  ],
  slots: [],
  isAuthenticated: false, // Default to false to force login
};

// --- Context ---

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem("slot-manager-data");
    const parsed = saved ? JSON.parse(saved) : INITIAL_STATE;
    return { ...parsed, isAuthenticated: parsed.isAuthenticated ?? false };
  });

  useEffect(() => {
    localStorage.setItem("slot-manager-data", JSON.stringify(state));
  }, [state]);

  const login = () => setState(prev => ({ ...prev, isAuthenticated: true }));
  const logout = () => setState(prev => ({ ...prev, isAuthenticated: false }));

  const addPhone = (data: Omit<Phone, "id" | "createdAt">) => {
    if (state.phones.some(p => p.phoneNumber === data.phoneNumber)) {
      throw new Error("Phone number already exists");
    }
    const newPhone: Phone = { ...data, id: nanoid(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, phones: [newPhone, ...prev.phones] }));
  };

  const updatePhone = (id: string, data: Partial<Phone>) => {
    setState(prev => ({
      ...prev,
      phones: prev.phones.map(p => p.id === id ? { ...p, ...data } : p)
    }));
  };

  const deletePhone = (id: string) => {
    setState(prev => ({
      ...prev,
      phones: prev.phones.filter(p => p.id !== id),
      slots: prev.slots.filter(s => s.phoneId !== id) 
    }));
  };

  const addIp = (data: Omit<IP, "id" | "createdAt">) => {
    if (state.ips.some(i => i.ipAddress === data.ipAddress)) {
      throw new Error("IP Address already exists");
    }
    const newIp: IP = { ...data, id: nanoid(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, ips: [newIp, ...prev.ips] }));
  };

  const updateIp = (id: string, data: Partial<IP>) => {
    setState(prev => ({
      ...prev,
      ips: prev.ips.map(i => i.id === id ? { ...i, ...data } : i)
    }));
  };

  const deleteIp = (id: string) => {
    setState(prev => ({
      ...prev,
      ips: prev.ips.filter(i => i.id !== id),
      slots: prev.slots.filter(s => s.ipId !== id)
    }));
  };

  const getPhoneSlotUsage = (phoneId: string) => {
    const cutoff = subDays(new Date(), 15);
    return state.slots
      .filter(s => s.phoneId === phoneId && isAfter(parseISO(s.usedAt), cutoff))
      .reduce((acc, curr) => acc + (curr.count || 1), 0);
  };

  const getIpSlotUsage = (ipId: string) => {
    const cutoff = subDays(new Date(), 15);
    return state.slots
      .filter(s => s.ipId === ipId && isAfter(parseISO(s.usedAt), cutoff))
      .reduce((acc, curr) => acc + (curr.count || 1), 0);
  };

  const addSlot = (phoneId: string, ipId: string, count: number, date: Date) => {
    // We removed the hard validation block as requested ("that not maximum 4")
    // Now we just allow it, but we still track usage for display.
    
    const newSlot: Slot = {
      id: nanoid(),
      phoneId,
      ipId,
      count,
      usedAt: date.toISOString()
    };

    setState(prev => ({ ...prev, slots: [newSlot, ...prev.slots] }));
    return { success: true };
  };

  const resetData = () => {
    setState({ ...INITIAL_STATE, isAuthenticated: true }); // Keep logged in
  };

  return (
    <StoreContext.Provider value={{
      ...state,
      addPhone,
      updatePhone,
      deletePhone,
      addIp,
      updateIp,
      deleteIp,
      addSlot,
      getPhoneSlotUsage,
      getIpSlotUsage,
      resetData,
      login,
      logout
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
