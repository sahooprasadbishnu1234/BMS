import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-950/60 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
