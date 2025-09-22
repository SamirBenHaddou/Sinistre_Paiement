import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Mail, ScanText, ListChecks, CreditCard } from 'lucide-react';

const Header = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'email', label: 'Traitement Email', icon: Mail },
    { id: 'ocr', label: 'OCR IBAN', icon: ScanText },
    { id: 'claims', label: 'Tous les Sinistres', icon: ListChecks },
    { id: 'payments', label: 'Paiements', icon: CreditCard },
  ];

  return (
    <header className="bg-slate-900/50 backdrop-blur-lg sticky top-0 z-50 border-b border-white/10">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ duration: 0.5 }}>
              <img alt="Logo de l'application" class="h-8 w-8" src="https://images.unsplash.com/photo-1691405167344-c3bbc9710ad2" />
            </motion.div>
            <span className="text-xl font-bold text-white">ClaimsFlow</span>
          </div>
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`${
                  activeTab === item.id ? 'text-white' : 'text-slate-400 hover:text-white'
                } relative rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center space-x-2`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {activeTab === item.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                    layoutId="underline"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;