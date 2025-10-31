
import { User, Case, DocumentFile, UserRole } from './types';

export const mockUsers: Record<string, User> = {
  admin: {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@acelegalpartnerssl.com',
    role: UserRole.Admin,
    avatarUrl: 'https://picsum.photos/seed/admin/100/100',
    password: 'Cloud@Acelegalpartners_2025',
    status: 'Active',
  }
};

export const mockDocuments: DocumentFile[] = [];

export const mockCases: Case[] = [];