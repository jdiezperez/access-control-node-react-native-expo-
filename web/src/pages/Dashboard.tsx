import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Users, Plus, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const [company, setCompany] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [compRes, usersRes] = await Promise.all([
        axios.get('/api/admin/company', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCompany(compRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/company', company, { headers: { Authorization: `Bearer ${token}` } });
      alert('Company updated!');
    } catch (err) {
      alert('Failed to update company');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      {/* Company Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="text-primary" />
          <h2 className="text-2xl font-bold text-secondary">Company Information</h2>
        </div>
        <form onSubmit={handleUpdateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            placeholder="Company Name" 
            className="p-2 border rounded" 
            value={company.name || ''} 
            onChange={e => setCompany({...company, name: e.target.value})}
          />
          <input 
            placeholder="Address" 
            className="p-2 border rounded" 
            value={company.address || ''} 
            onChange={e => setCompany({...company, address: e.target.value})}
          />
          <input 
            placeholder="Email" 
            className="p-2 border rounded" 
            value={company.email || ''} 
            onChange={e => setCompany({...company, email: e.target.value})}
          />
          <input 
            placeholder="Phone" 
            className="p-2 border rounded" 
            value={company.phone || ''} 
            onChange={e => setCompany({...company, phone: e.target.value})}
          />
          <button type="submit" className="btn-primary w-fit">Update Company</button>
        </form>
      </section>

      {/* Users Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-primary" />
            <h2 className="text-2xl font-bold text-secondary">Users Management</h2>
          </div>
          <button className="btn-primary flex items-center gap-1">
            <Plus size={18} /> Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Email</th>
                <th className="p-3 border">Type</th>
                <th className="p-3 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 border">{user.name} {user.surname}</td>
                  <td className="p-3 border">{user.email}</td>
                  <td className="p-3 border">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {user.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 border">
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
