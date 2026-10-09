import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  FileCheck2,
  Award,
  Bell,
  Home,
  UserCheck,
  History,
  Settings,
  Shield,
  Mail,
  Send,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  isActiveMatch: (currentPath: string) => boolean;
}

export const AFFILIATE_NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    title: 'Tổng quan',
    path: '/portal',
    icon: LayoutDashboard,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return (
        clean === '/portal' ||
        clean === '/portal/' ||
        clean === '/portal/dashboard' ||
        clean === '/portal/overview'
      );
    },
  },
  {
    id: 'courses',
    title: 'Khóa học',
    path: '/portal/courses',
    icon: BookOpen,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/portal/courses' || clean.startsWith('/portal/courses/');
    },
  },
  {
    id: 'leads',
    title: 'Khách hàng được giới thiệu',
    path: '/portal/leads',
    icon: Users,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/portal/leads' || clean.startsWith('/portal/leads/');
    },
  },
  {
    id: 'notifications',
    title: 'Thông báo',
    path: '/portal/notifications',
    icon: Bell,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/portal/notifications' || clean.startsWith('/portal/notifications/');
    },
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'admin_overview',
    title: 'Tổng quan',
    path: '/admin',
    icon: LayoutDashboard,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin' || clean === '/admin/';
    },
  },
  {
    id: 'admin_affiliates',
    title: 'Quản lý CTV',
    path: '/admin/affiliates',
    icon: Users,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/affiliates';
    },
  },
  {
    id: 'admin_courses',
    title: 'Quản lý khóa học',
    path: '/admin/courses',
    icon: BookOpen,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/courses';
    },
  },
  {
    id: 'admin_leads',
    title: 'Khách hàng được giới thiệu',
    path: '/admin/leads',
    icon: FileText,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/leads';
    },
  },
  {
    id: 'admin_reconcile',
    title: 'Đối chiếu hồ sơ & học phí',
    path: '/admin/reconcile',
    icon: FileCheck2,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/reconcile';
    },
  },
  {
    id: 'admin_rewards',
    title: 'Thù lao CTV',
    path: '/admin/rewards',
    icon: Award,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/rewards';
    },
  },
  {
    id: 'admin_notifications',
    title: 'Quản lý thông báo',
    path: '/admin/notifications',
    icon: Bell,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/notifications' || clean.startsWith('/admin/notifications');
    },
  },
  {
    id: 'admin_homepage',
    title: 'Quản lý trang chủ',
    path: '/admin/homepage',
    icon: Home,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/homepage';
    },
  },
  {
    id: 'admin_staff',
    title: 'Tài khoản nhân viên',
    path: '/admin/staff-accounts',
    icon: UserCheck,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/staff-accounts';
    },
  },
  {
    id: 'admin_audit',
    title: 'Nhật ký hệ thống',
    path: '/admin/audit',
    icon: History,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/audit';
    },
  },
  {
    id: 'admin_permissions',
    title: 'Quản lý phân quyền',
    path: '/admin/permissions',
    icon: Shield,
    adminOnly: true,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/permissions';
    },
  },
  {
    id: 'admin_system_settings',
    title: 'Quản trị hệ thống',
    path: '/admin/system-settings',
    icon: Settings,
    adminOnly: true,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/system-settings';
    },
  },
  {
    id: 'admin_email_templates',
    title: 'Quản lý Mẫu Email',
    path: '/admin/email-templates',
    icon: Mail,
    adminOnly: true,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/email-templates';
    },
  },
  {
    id: 'admin_email_jobs',
    title: 'Giám sát Hàng đợi Email',
    path: '/admin/email-jobs',
    icon: Send,
    adminOnly: true,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/email-jobs';
    },
  },
];
