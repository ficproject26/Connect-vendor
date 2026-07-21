import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { useSelector } from 'react-redux';
import { 
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Truck, User, 
  LogOut, Bell, Settings, CreditCard, Store, ChevronLeft, ChevronRight, Home, HeartHandshake, Utensils, Hotel, Briefcase, Layers, IndianRupee, ShieldAlert
} from 'lucide-react';

const Sidebar = () => {
  const { 
    activeTab, setActiveTab, sidebarCollapsed, user, activeBusinessId, dispatch, logout, switchBusinessSuccess, setMessage, getOrderVendorType, vendorType, terms, setIsUserInfoOpen
  } = useDashboard();

  const getFirstItem = () => {
    if (user?.role === 'Member') return { id: 'dashboard', name: 'Home', icon: Home };
    return { id: 'dashboard', name: 'Overview', icon: LayoutDashboard };
  };

  const getPartnerLabel = () => {
    const rawType = user?.vendorType || '';
    const isService = rawType.startsWith('Services') || ['Hospital Vendor', 'Service Provider Vendor'].includes(vendorType);
    const isStay = rawType.startsWith('Stay') || ['Hotel Vendor'].includes(vendorType);
    const isTravel = rawType.startsWith('Travel') || ['Travel Agency Vendor'].includes(vendorType);
    const isProduct = rawType.startsWith('Products') || ['Store Vendor', 'Electronics Vendor', 'Home & Furniture Vendor'].includes(vendorType);
    const isDailyNeed = rawType.startsWith('Daily Needs') || ['Grocery Vendor', 'Pharmacy Vendor'].includes(vendorType);
    const isFood = rawType.startsWith('Food') || ['Restaurant Vendor'].includes(vendorType);

    if (isService) {
      return 'Add Technician';
    } else if (isStay || isTravel) {
      return 'Add Executive';
    } else if (isProduct || isDailyNeed || isFood) {
      return 'Delivery Partners';
    }

    if (['Hospital Vendor', 'Service Provider Vendor'].includes(vendorType)) {
      return 'Add Technician';
    }
    if (['Hotel Vendor', 'Travel Agency Vendor'].includes(vendorType)) {
      return 'Add Executive';
    }
    return 'Delivery Partners';
  };

  const getSidebarItems = () => {
    if (user?.role === 'Admin') {
      return [
        { id: 'requests', name: 'Vendor Requests', icon: ShieldAlert },
        { id: 'vendors', name: 'Manage Vendors', icon: Store },
        { id: 'members', name: 'Registered Members', icon: Users },
        { id: 'payments', name: 'Payments', icon: IndianRupee },
        { id: 'settings', name: 'Plans & Settings', icon: Settings }
      ];
    }
    if (user?.role === 'Member') {
      return [
        { id: 'Services', name: 'Services', icon: HeartHandshake },
        { id: 'Products', name: 'Products', icon: ShoppingBag },
        { id: 'Daily Needs', name: 'Daily Needs', icon: Store },
        { id: 'Food', name: 'Food', icon: Utensils },
        { id: 'Stay', name: 'Stay', icon: Hotel },
        { id: 'Travel', name: 'Travel', icon: Truck },
        { id: 'Jobs', name: 'Jobs', icon: Briefcase }
      ];
    }
    const items = [
      { id: 'orders', name: terms.ordersName, icon: ClipboardList },
      { id: 'customers', name: terms.customersName, icon: Users }
    ];
    const partnerLabel = getPartnerLabel();
    if (!['Education Vendor', 'Job Vendor'].includes(vendorType)) {
      items.push({ id: 'delivery', name: partnerLabel, icon: Truck });
    }
    items.push({ id: 'payments', name: 'Payments', icon: IndianRupee });
    items.push({ id: 'business', name: 'Business', icon: Store });
    items.push({ id: 'profile', name: 'Business Settings', icon: User });
    return items;
  };

  const getBusinessSidebarItems = () => {
    if (user?.role !== 'Vendor' || !user?.businesses) return [];
    return user.businesses.map(biz => {
      const type = biz.vendorType || '';
      let Icon = Store;
      if (type.startsWith('Products')) Icon = ShoppingBag;
      else if (type.startsWith('Daily Needs')) Icon = Store;
      else if (type.startsWith('Food')) Icon = Utensils;
      else if (type.startsWith('Stay')) Icon = Hotel;
      else if (type.startsWith('Travel')) Icon = Truck;
      else if (type.startsWith('Jobs')) Icon = Briefcase;
      else if (type.startsWith('Services')) Icon = HeartHandshake;

      return {
        id: biz._id,
        name: type,
        icon: Icon,
        isActive: biz._id === activeBusinessId
      };
    });
  };

  const firstItem = getFirstItem();
  const FirstIcon = firstItem.icon;
  const bizItems = getBusinessSidebarItems();
  const menuItems = getSidebarItems();

  return (
    <div className={`w-full ${sidebarCollapsed ? 'md:w-20 p-3 md:p-4' : 'md:w-64 p-5'} bg-[#00122e] text-white shrink-0 transition-all duration-300 shadow-xl border-r border-[#0B3C7B]/20 flex flex-col justify-between md:h-screen md:sticky md:top-0 overflow-y-auto`}>
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div onClick={() => dispatch(toggleSidebar())} className="flex items-center gap-2 cursor-pointer select-none" title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <div className="rounded-xl shadow-md overflow-hidden flex items-center justify-center shrink-0 w-8 h-8">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            {!sidebarCollapsed && <span className="text-lg font-bold tracking-tight"><span className="text-white">Connect</span> <span className="text-[#faed26]">App</span></span>}
          </div>
          {!sidebarCollapsed && (
            <button onClick={() => dispatch(toggleSidebar())} className="p-1 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveTab(firstItem.id)}
                className={`w-full flex items-center gap-3 text-left ${sidebarCollapsed ? 'md:justify-center px-4' : 'px-4'} py-3 rounded-2xl text-sm font-semibold transition-all border border-transparent ${
                  activeTab === firstItem.id 
                    ? 'bg-white/15 text-[#faed26] font-bold border border-white/10 shadow-md' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FirstIcon size={18} className="shrink-0" />
                {!sidebarCollapsed && <span className="text-left leading-snug">{firstItem.name}</span>}
              </button>
            </li>
          </ul>

          {bizItems.length > 0 && (
            <div className="space-y-1.5">
              {!sidebarCollapsed && <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider px-4 mb-1">My Categories</p>}
              <ul className="space-y-1">
                {bizItems.map(biz => {
                  const Icon = biz.icon;
                  return (
                    <li key={biz.id}>
                      <button
                        onClick={() => {
                          if (!biz.isActive) {
                            dispatch(switchBusinessSuccess(biz.id));
                            setMessage(`Switched business profile to ${biz.name}!`);
                          }
                          setActiveTab('catalog');
                        }}
                        className={`w-full flex items-center gap-3 text-left ${sidebarCollapsed ? 'md:justify-center px-4' : 'px-4'} py-3 rounded-2xl text-sm font-semibold transition-all border border-transparent ${
                          biz.isActive 
                            ? 'bg-[#faed26] text-[#0B3C7B] shadow-lg font-bold animate-fadeIn' 
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={18} className="shrink-0" />
                        {!sidebarCollapsed && <span className="text-left leading-snug">{biz.name}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-white/10 my-3" />
            </div>
          )}

          <div className="space-y-1.5">
            {!sidebarCollapsed && bizItems.length > 0 && <p className="text-[10px] font-bold text-white/45 uppercase tracking-wider px-4 mb-1">Dashboard Menu</p>}
            <ul className="space-y-1.5">
              {menuItems.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 text-left ${sidebarCollapsed ? 'md:justify-center px-4' : 'px-4'} py-3 rounded-2xl text-sm font-semibold transition-all border border-transparent ${
                        activeTab === item.id 
                          ? 'bg-white/15 text-[#faed26] font-bold border border-white/10 shadow-md' 
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!sidebarCollapsed && <span className="text-left leading-snug">{item.name}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 mt-6 space-y-4">
        <div onClick={() => setIsUserInfoOpen(true)} className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-2' : 'items-center gap-3'} p-2 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center text-[#0B3C7B] font-extrabold text-sm shadow-md shrink-0 font-mono">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-white/50 truncate font-semibold uppercase">{user?.role === 'Vendor' ? user.businessName : user?.role}</p>
            </div>
          )}
        </div>
        <div className="flex justify-center w-full">
          <button onClick={() => dispatch(logout())} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all border border-red-500/15">
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="font-semibold text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
