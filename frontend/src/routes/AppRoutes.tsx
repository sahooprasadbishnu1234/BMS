import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shell } from '../components/layout/Shell';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';

// 10 Role Dashboards
import { CustomerDashboard } from '../pages/customer/CustomerDashboard';
import { BankManagerDashboard } from '../pages/bank-manager/BankManagerDashboard';
import { BranchManagerDashboard } from '../pages/branch-manager/BranchManagerDashboard';
import { TellerDashboard } from '../pages/teller/TellerDashboard';
import { AccountantDashboard } from '../pages/accountant/AccountantDashboard';
import { LoanOfficerDashboard } from '../pages/loan-officer/LoanOfficerDashboard';
import { CustomerServiceDashboard } from '../pages/customer-service/CustomerServiceDashboard';
import { AdministratorDashboard } from '../pages/administrator/AdministratorDashboard';
import { AuditorDashboard } from '../pages/auditor/AuditorDashboard';
import { ComplianceDashboard } from '../pages/compliance/ComplianceDashboard';

export const AppRoutes: React.FC = () => {
  const { user, activeRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Initializing APEX Banking Core...
          </p>
        </div>
      </div>
    );
  }

  const renderRoleDashboard = () => {
    switch (activeRole) {
      case 'CUSTOMER':
        return <CustomerDashboard />;
      case 'BANK_MANAGER':
        return <BankManagerDashboard />;
      case 'BRANCH_MANAGER':
        return <BranchManagerDashboard />;
      case 'BANK_TELLER':
        return <TellerDashboard />;
      case 'ACCOUNTANT':
        return <AccountantDashboard />;
      case 'LOAN_OFFICER':
        return <LoanOfficerDashboard />;
      case 'CUSTOMER_SERVICE_OFFICER':
        return <CustomerServiceDashboard />;
      case 'SYSTEM_ADMINISTRATOR':
        return <AdministratorDashboard />;
      case 'AUDITOR':
        return <AuditorDashboard />;
      case 'COMPLIANCE_OFFICER':
        return <ComplianceDashboard />;
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/register"
        element={!user ? <Register /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/*"
        element={
          user ? (
            <Shell>{renderRoleDashboard()}</Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};
