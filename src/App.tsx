import React, { Suspense, lazy } from 'react';
import { HRMSProvider, useHRMS } from './context/HRMSContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardModule } from './components/modules/DashboardModule';
import { AppLockOverlay } from './components/ui/AppLockOverlay';

// Lazy-loaded application modules for optimized Vite build chunking
const PeopleModule = lazy(() =>
  import('./components/modules/PeopleModule').then((m) => ({ default: m.PeopleModule }))
);
const AttendanceModule = lazy(() =>
  import('./components/modules/AttendanceModule').then((m) => ({ default: m.AttendanceModule }))
);
const LeaveModule = lazy(() =>
  import('./components/modules/LeaveModule').then((m) => ({ default: m.LeaveModule }))
);
const PayrollModule = lazy(() =>
  import('./components/modules/PayrollModule').then((m) => ({ default: m.PayrollModule }))
);
const ConsiderationsModule = lazy(() =>
  import('./components/modules/ConsiderationsModule').then((m) => ({ default: m.ConsiderationsModule }))
);
const CalendarModule = lazy(() =>
  import('./components/modules/CalendarModule').then((m) => ({ default: m.CalendarModule }))
);
const ReportsModule = lazy(() =>
  import('./components/modules/ReportsModule').then((m) => ({ default: m.ReportsModule }))
);
const MoreHubModule = lazy(() =>
  import('./components/modules/MoreHubModule').then((m) => ({ default: m.MoreHubModule }))
);
const CompanyInfoModule = lazy(() =>
  import('./components/modules/CompanyInfoModule').then((m) => ({ default: m.CompanyInfoModule }))
);
const ApprovalRequestsModule = lazy(() =>
  import('./components/modules/ApprovalRequestsModule').then((m) => ({ default: m.ApprovalRequestsModule }))
);
const ManageAccessModule = lazy(() =>
  import('./components/modules/ManageAccessModule').then((m) => ({ default: m.ManageAccessModule }))
);
const DepartmentsModule = lazy(() =>
  import('./components/modules/DepartmentsModule').then((m) => ({ default: m.DepartmentsModule }))
);
const OrgTreesModule = lazy(() =>
  import('./components/modules/OrgTreesModule').then((m) => ({ default: m.OrgTreesModule }))
);
const SettingsModule = lazy(() =>
  import('./components/modules/SettingsModule').then((m) => ({ default: m.SettingsModule }))
);
const MobileAppManagementModule = lazy(() =>
  import('./components/modules/MobileAppManagementModule').then((m) => ({ default: m.MobileAppManagementModule }))
);

function ModuleLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-12 text-xs text-[#86868B] animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-[#1D1D1F] dark:border-white border-t-transparent animate-spin" />
        <span>Loading Module...</span>
      </div>
    </div>
  );
}

function ModuleRouter() {
  const { activeModule, currentUser } = useHRMS();
  const isEmployee =
    currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER';

  return (
    <Suspense fallback={<ModuleLoadingFallback />}>
      {(() => {
        switch (activeModule) {
          case 'dashboard':
            return <DashboardModule />;
          case 'manage-access':
            return <ManageAccessModule />;
          case 'mobile-app':
            return <MobileAppManagementModule />;
          case 'departments-mgmt':
            return <DepartmentsModule />;
          case 'org-tree':
            return <OrgTreesModule />;
          case 'approvals':
            return <ApprovalRequestsModule />;
          case 'people':
          case 'my-team':
          case 'my-profile':
            return <PeopleModule />;
          case 'attendance':
            return <AttendanceModule />;
          case 'leave':
            return <LeaveModule />;
          case 'payroll':
            return <PayrollModule />;
          case 'company-info':
            return <CompanyInfoModule />;
          case 'considerations':
            return <ConsiderationsModule />;
          case 'documents':
            return <DashboardModule />;
          case 'calendar':
            return <CalendarModule />;
          case 'reports':
            return isEmployee ? <DashboardModule /> : <ReportsModule />;
          case 'settings':
            return <SettingsModule />;
          case 'more':
            return <MoreHubModule />;
          default:
            return <DashboardModule />;
        }
      })()}
    </Suspense>
  );
}

function MainContent() {
  const { isAuthenticated } = useHRMS();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <AppShell>
        <ModuleRouter />
      </AppShell>
      <AppLockOverlay />
    </>
  );
}

export default function App() {
  return (
    <HRMSProvider>
      <MainContent />
    </HRMSProvider>
  );
}

