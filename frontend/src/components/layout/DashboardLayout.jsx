import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Barre latérale gauche */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteneur principal (décalé de 18rem / 72px sur écran large pour la sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Barre de navigation supérieure */}
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Zone de contenu principale */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
