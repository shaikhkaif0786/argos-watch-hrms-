import React from 'react';
import { HRMSProvider, useHRMS } from './context/HRMSContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardModule } from './components/modules/DashboardModule';
import { PeopleModule } from './components/modules/PeopleModule';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { LeaveModule } from './components/modules/LeaveModule';
import { PayrollModule } from './components/modules/PayrollModule';
import { ConsiderationsModule } from './components/modules/ConsiderationsModule';
import { DocumentsModule } from './components/modules/DocumentsModule';
import { CalendarModule } from './components/modules/CalendarModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { MoreHubModule } from './components/modules/MoreHubModule';
import { CompanyInfoModule } from './components/modules/CompanyInfoModule';
import { ApprovalRequestsModule } from './components/modules/ApprovalRequestsModule';
import { ManageAccessModule } from './components/modules/ManageAccessModule';
import { DepartmentsModule } from './components/modules/DepartmentsModule';
import { OrgTreesModule } from './components/modules/OrgTreesModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { MobileAppManagementModule } from './components/modules/MobileAppManagementModule';
import { AppLockOverlay } from './components/ui/AppLockOverlay';

function ModuleRouter() {
  const { activeModule, currentUser } = useHRMS();
  const isEmployee =
    currentUser.role === 'EMPLOYEE' || currentUser.role === 'MANAGER';

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

