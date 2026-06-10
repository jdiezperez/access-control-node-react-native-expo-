import { Outlet } from 'react-router-dom';
import NavBar from '@/components/NavBar';

const AdminLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            {/*
            <nav className="bg-secondary text-white p-4 shadow-lg flex justify-between items-center">
                <h1 className="text-xl font-bold">Access Control Admin</h1>
                <div className='flex gap-4'>
                    <Link to="/admin/company" className="text-sm opacity-80 hover:opacity-100">Company Info</Link>
                    <span className="text-sm mx-1">|</span>
                    <button
                        onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
                        className="text-sm opacity-80 hover:opacity-100"
                    >
                        Logout
                    </button>
                </div>
            </nav>
            <main className="flex-1 p-6">
                <div className="flex gap-4 mb-6">
                    <Link to="/admin" className="hover:text-primary transition-colors">Dashboard</Link>
                    <Link to="/admin/events" className="hover:text-primary transition-colors">Events</Link>
                    <Link to="/admin/users" className="hover:text-primary transition-colors">Users</Link>
                    <Link to="/admin/sponsors" className="hover:text-primary transition-colors">Sponsors</Link>
                </div>
                <div className="glass-card p-6">
                    <Outlet />
                </div>
            </main>
            */}
            <NavBar />
            <div className="glass-card p-16">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;