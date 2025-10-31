
export enum UserRole {
  Client = 'Client',
  Lawyer = 'Lawyer',
  Admin = 'Admin',
  Secretary = 'Secretary',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  password?: string;
  status: 'Active' | 'Inactive' | 'Invited';
}

export interface DocumentFile {
  id: string;
  name: string;
  type: 'PDF' | 'Word' | 'Image' | 'Other' | 'Correspondence';
  size: string;
  uploadedBy: string;
  uploadDate: string;
  version: number;
  content: string; // Mock content for summarization
  status: 'Draft' | 'Final' | 'Archived';
  tags?: string[];
}

export interface KeyDate {
    id: string;
    date: string;
    description: string;
}

export interface InternalNote {
    id: string;
    author: string;
    content: string;
    timestamp: string;
}

export interface Case {
  id:string;
  caseNumber: string;
  title: string;
  client: User;
  assignedLawyer: User;
  status: 'Active' | 'Closed' | 'Pending';
  documents: DocumentFile[];
  auditLogs: AuditLog[];
  legalHold?: boolean;
  caseType: string;
  keyDates: KeyDate[];
  internalNotes: InternalNote[];
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
  category?: 'User Action' | 'Security' | 'System';
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  caseId: string;
}

export interface Settings {
    theme: 'light' | 'dark';
    firmName: string;
    firmAddress: string;
    retentionPeriod: string;
    versioning: boolean;
    ipWhitelist: string;
}