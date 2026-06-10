import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, Loader2, Building2 } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            const user = res.data.user;
            if (user.type !== 'admin' && user.type !== 'manager') {
                setError('Access denied. Only admins and managers can access the dashboard.');
                setLoading(false);
                return;
            }
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(user));
            navigate('/admin');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl text-primary mb-6 animate-in fade-in zoom-in duration-500">
                        <Building2 size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Admin Portal</h1>
                    <p className="text-slate-500 font-medium">Access your company management dashboard</p>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 animate-in slide-in-from-bottom-8 duration-700">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3">
                            <ShieldAlert size={20} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium text-slate-700"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-medium text-slate-700"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-primary text-white py-4 rounded-2xl text-lg font-bold shadow-xl shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-slate-400 text-sm font-medium">
                    &copy; 2026 Access Control Management System
                </p>
            </div>
        </div>
    );
};

export default Login;
