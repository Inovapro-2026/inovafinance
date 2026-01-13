import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Shield,
  LogOut,
  LayoutDashboard,
  Users,
  DollarSign,
  CalendarDays,
  Settings,
  UserCheck,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  UsersRound
} from "lucide-react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'approvals', label: 'Aprovações', icon: UserCheck },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'financial', label: 'Financeiro', icon: DollarSign },
  { id: 'affiliates', label: 'Afiliados', icon: UsersRound },
  { id: 'support', label: 'Suporte', icon: MessageCircle },
  { id: 'planning', label: 'Planejamento', icon: CalendarDays },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export function AdminSidebar({ activeTab, onTabChange, onLogout }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileOpen(false);
  };

  // Mobile Menu Button
  const MobileMenuButton = () => (
    <button
      onClick={toggleMobile}
      className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-white shadow-lg"
    >
      {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );

  // Sidebar Content
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`flex flex-col h-full ${isMobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo/Header */}
      <div className={`p-4 border-b border-slate-700 flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <AnimatePresence>
          {(!isCollapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-lg font-bold text-white whitespace-nowrap">INOVAFINANCE</h1>
              <p className="text-xs text-slate-400 whitespace-nowrap">Painel Admin</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                } ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                <AnimatePresence>
                  {(!isCollapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Badge for support */}
                {item.id === 'support' && (!isCollapsed || isMobile) && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Novo
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full text-slate-400 hover:text-white hover:bg-slate-700 ${
            isCollapsed && !isMobile ? 'justify-center p-2' : 'justify-start'
          }`}
          title={isCollapsed && !isMobile ? 'Sair' : undefined}
        >
          <LogOut className="w-5 h-5" />
          <AnimatePresence>
            {(!isCollapsed || isMobile) && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-3 whitespace-nowrap overflow-hidden"
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Collapse Toggle (Desktop only) */}
      {!isMobile && (
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <MobileMenuButton />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 bg-slate-800 border-r border-slate-700"
          >
            <SidebarContent isMobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:block relative bg-slate-800 border-r border-slate-700 h-screen sticky top-0"
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
