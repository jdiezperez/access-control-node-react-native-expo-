import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ChevronRight, ShieldCheck } from 'lucide-react';

export default function SuperAdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (href: string) =>
        location.pathname === href || location.pathname.startsWith(href + '/');

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* Superadmin Navbar */}
            <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-0 flex items-center justify-between h-16">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <div>
                            <span className="text-white font-black text-lg tracking-tight">SuperAdmin</span>
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md text-purple-300 border border-purple-500/30" style={{ background: 'rgba(139,92,246,0.15)' }}>
                                Control Panel
                            </span>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        <Link
                            to="/superadmin/companies"
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                isActive('/superadmin/companies')
                                    ? 'bg-white/10 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Building2 size={16} />
                            Companies
                        </Link>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* Breadcrumb */}
            <div className="border-b border-white/5 bg-black/10">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck size={12} className="text-purple-400" />
                    <span className="text-purple-400 font-semibold">SuperAdmin</span>
                    <ChevronRight size={12} />
                    <span className="text-slate-400 font-medium">Companies</span>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                <Outlet />
            </main>
        </div>
    );
}
