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

export interface DashboardStats {
  waitingCount: number;
  inServiceCount: number;
  servedCount: number;
  noShowCount: number;
  totalCounters: number;
  averageWaitTime: number;
  averageServiceTime: number;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAt: string;
  userName: string;
  userRole?: string;
}

export interface AuditLogResponse {
  items: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Évaluations
export interface Rating {
  id: number;
  ticketId: number;
  ticketNumber: string;
  serviceName: string;
  clientName: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export type ScoreDistribution = Record<number, number>;

export interface RatingListResponse {
  items: Rating[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRatings: number;
  averageScore: number;
  distribution: ScoreDistribution;
}