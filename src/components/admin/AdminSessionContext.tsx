'use client';
import { createContext, useContext } from 'react';
import type { AdminSession } from '@/lib/admin-session';
export const AdminSessionContext = createContext<AdminSession | null>(null);
export const useAdminSession = () => useContext(AdminSessionContext);
