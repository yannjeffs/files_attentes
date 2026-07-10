// Authentification
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "Agent" | "Admin";
  agencyId: number;
}

export interface AuthResponse {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  agencyId: number;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

//Services
export interface Service {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  agencyId: number;
  createdAt: string;
}

// Guichets
export interface Counter {
  id: number;
  number: number;
  name: string;
  isActive: boolean;
  agencyId: number;
  createdAt: string;
}

// Tickets
export type TicketStatus =
  | "Waiting"
  | "Called"
  | "InProgress"
  | "Done"
  | "NoShow"
  | "Cancelled"
  | "Transferred";

export type TicketPriority = "Normal" | "VIP";
export type TicketSource = "Ticket" | "Kiosk";

export interface Ticket {
  id: number;
  ticketNumber: string;
  serviceName: string;
  serviceCode: string;
  clientName: string;
  clientPhone: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  estimatedWaitTime?: number;
  counterNumber?: number;
  agentName?: string;
  issuedAt?: string;
  calledAt?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface TicketCreateRequest {
  serviceId: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  accountNumber?: string;
}

export interface DashboardStats {
    waitingCount: number;
    inServiceCount: number;
    servedCount: number;
    noShowCount: number;
    totalCounters: number;
    averageWaitTime: number;
    averageServiceTime: number;
}

// Position d'un ticket dans la file
export interface TicketPosition {
  position: number;
  peopleAhead: number;
  estimatedWaitTime: number;
  status: TicketStatus;
  counterNumber?: number;
}

// Mise à jour de la position via SignalR
export interface PositionUpdate {
  ticketId: number;
  peopleAhead: number;
  estimatedWaitTime: number;
}

// Modification des infos client
export interface TicketUpdateClientRequest {
  phone: string;
  email?: string;
}
