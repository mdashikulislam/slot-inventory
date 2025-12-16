import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Phone, Ip, Slot, InsertPhone, InsertIp, InsertSlot } from "@shared/schema";

// ===== Phone Hooks =====

export function usePhones() {
  return useQuery<Phone[]>({
    queryKey: ["/api/phones"],
  });
}

export function usePhone(id: string) {
  return useQuery<Phone>({
    queryKey: ["/api/phones", id],
    enabled: !!id,
  });
}

export function useCreatePhone() {
  return useMutation({
    mutationFn: async (data: InsertPhone) => {
      const res = await apiRequest("POST", "/api/phones", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phones"] });
    },
  });
}

export function useUpdatePhone() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPhone> }) => {
      const res = await apiRequest("PATCH", `/api/phones/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phones"] });
    },
  });
}

export function useDeletePhone() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/phones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
    },
  });
}

export function usePhoneSlotUsage(phoneId: string) {
  return useQuery<{ usage: number }>({
    queryKey: ["/api/phones", phoneId, "usage"],
    enabled: !!phoneId,
  });
}

// ===== IP Hooks =====

export function useIps() {
  return useQuery<Ip[]>({
    queryKey: ["/api/ips"],
  });
}

export function useIp(id: string) {
  return useQuery<Ip>({
    queryKey: ["/api/ips", id],
    enabled: !!id,
  });
}

export function useCreateIp() {
  return useMutation({
    mutationFn: async (data: InsertIp) => {
      const res = await apiRequest("POST", "/api/ips", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ips"] });
    },
  });
}

export function useUpdateIp() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertIp> }) => {
      const res = await apiRequest("PATCH", `/api/ips/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ips"] });
    },
  });
}

export function useDeleteIp() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ips/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
    },
  });
}

export function useIpSlotUsage(ipId: string) {
  return useQuery<{ usage: number }>({
    queryKey: ["/api/ips", ipId, "usage"],
    enabled: !!ipId,
  });
}

// ===== Slot Hooks =====

export function useSlots() {
  return useQuery<Slot[]>({
    queryKey: ["/api/slots"],
  });
}

export function useSlot(id: string) {
  return useQuery<Slot>({
    queryKey: ["/api/slots", id],
    enabled: !!id,
  });
}

export function useCreateSlot() {
  return useMutation({
    mutationFn: async (data: InsertSlot) => {
      const res = await apiRequest("POST", "/api/slots", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ips"] });
    },
  });
}

export function useDeleteSlot() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/slots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ips"] });
    },
  });
}
