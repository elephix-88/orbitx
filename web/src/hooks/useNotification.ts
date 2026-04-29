import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
 id: string;
 type: NotificationType;
 title: string;
 message: string;
 duration?: number;
 centered?: boolean;
 compact?: boolean;
 emoji?: string;
 details?: string[];
}

interface NotificationStore {
 notifications: Notification[];
 addNotification: (_notification: Omit<Notification, 'id'>) => void;
 removeNotification: (_id: string) => void;
 clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
 notifications: [],
 addNotification: (notification) => {
 const id = crypto.randomUUID();
 const newNotification = {
 ...notification,
 id,
 };

 set((state) => ({
 notifications: [...state.notifications, newNotification],
 }));

 if (notification.duration !== 0) {
 setTimeout(() => {
 set((state) => ({
 notifications: state.notifications.filter((n) => n.id !== id),
 }));
 }, notification.duration || 5000);
 }
 },
 removeNotification: (id) =>
 set((state) => ({
 notifications: state.notifications.filter((n) => n.id !== id),
 })),
 clearNotifications: () => set({ notifications: [] }),
}));

export function useNotification() {
 const { addNotification, removeNotification, clearNotifications } = useNotificationStore();

 const notify = {
 success: (title: string, message: string, duration?: number) =>
 addNotification({ type: 'success', title, message, duration }),
 error: (title: string, message: string, duration?: number) =>
 addNotification({ type: 'error', title, message, duration }),
 warning: (title: string, message: string, duration?: number) =>
 addNotification({ type: 'warning', title, message, duration }),
 info: (title: string, message: string, duration?: number) =>
 addNotification({ type: 'info', title, message, duration }),
 successCenter: (title: string, message: string, duration: number = 1200) =>
 addNotification({ type: 'success', title, message, duration, centered: true, compact: true }),
 successDialog: (
 title: string,
 details: string[] = [],
 emoji: string = '✅',
 duration: number = 1500
 ) => addNotification({
 type: 'success',
 title,
 message: '',
 details,
 emoji,
 centered: true,
 compact: true,
 duration,
 }),
 errorDialog: (
 title: string,
 details: string[] = [],
 emoji: string = '❌',
 duration: number = 2000
 ) => addNotification({
 type: 'error',
 title,
 message: '',
 details,
 emoji,
 centered: true,
 compact: true,
 duration,
 }),
 };

 return {
 notify,
 removeNotification,
 clearNotifications,
 };
} 