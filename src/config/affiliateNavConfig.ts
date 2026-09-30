import { LayoutDashboard, BookOpen, Users, LucideIcon } from 'lucide-react';

export interface AffiliateNavItem {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  accessCondition: 'ACTIVE_AFFILIATE';
  isActiveMatch: (currentPath: string) => boolean;
}

export const AFFILIATE_NAV_ITEMS: AffiliateNavItem[] = [
  {
    id: 'overview',
    title: 'Tổng quan',
    path: '/portal',
    icon: LayoutDashboard,
    accessCondition: 'ACTIVE_AFFILIATE',
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
    accessCondition: 'ACTIVE_AFFILIATE',
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
    accessCondition: 'ACTIVE_AFFILIATE',
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/portal/leads' || clean.startsWith('/portal/leads/');
    },
  },
];
