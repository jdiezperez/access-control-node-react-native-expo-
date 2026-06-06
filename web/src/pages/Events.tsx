import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, MapPin, Plus, Image as ImageIcon, Mail, Star, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImagePath } from '@/utils/imagePath';

const Events = () => {
	const [events, setEvents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const token = localStorage.getItem('token');
	const navigate = useNavigate();

	useEffect(() => {
		fetchEvents();
	}, []);

	const fetchEvents = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events`, { headers: { Authorization: `Bearer ${token}` } });
			setEvents(res.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateEvent = () => {
		navigate('/admin/events/new');
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active': return 'bg-green-100 text-green-700 border-green-200';
			case 'completed': return 'bg-orange-100 text-orange-700 border-orange-200';
			case 'not active': return 'bg-gray-100 text-gray-700 border-gray-200';
			default: return 'bg-gray-100 text-gray-700 border-gray-200';
		}
	};

	if (loading) return <div>Loading...</div>;

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-secondary">Events Management</h2>
				<button onClick={handleCreateEvent} className="btn-primary flex items-center gap-1">
					<Plus size={18} /> New Event
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{events.map(event => (
					<div
						key={event.id}
						className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group"
					>
						{/* Card Header */}
						<div className="bg-gray-50 px-6 py-4 border-b border-gray-100 cursor-pointer" onClick={() => navigate(`/admin/events/${event.id}`)}>
							<h3 className="text-lg font-bold text-slate-800 hover:text-primary transition-colors">{event.name}</h3>
						</div>

						{/* Card Body */}
						<div className="p-6 flex gap-4">
							{/* Logo Left */}
							<div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
								{event.logo ? (
									<img src={getImagePath(event.logo, 'events')} alt={event.name} className="w-full h-full object-cover" />
								) : (
									<ImageIcon className="text-gray-400" size={32} />
								)}
							</div>

							{/* Info Right */}
							<div className="flex flex-col justify-center space-y-2 text-slate-600">
								<div className="flex items-center gap-2 text-sm">
									<Calendar size={14} className="text-primary" />
									<span>{event.date ? new Date(event.date).toLocaleDateString() : 'Date not set'}</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<MapPin size={14} className="text-primary" />
									<span className="truncate max-w-[150px]">
										{event.city && event.country ? `${event.city}, ${event.country}` : event.city || event.country || 'Location not set'}
									</span>
								</div>
							</div>
						</div>

						{/* Card Footer */}
						<div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
							<div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(event.status)}`}>
								{event.status?.toUpperCase() || 'ACTIVE'}
							</div>
							<div className='flex gap-2'>
								<button
									onClick={() => navigate(`/admin/events/${event.id}/guests`)}
									className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-1 cursor-pointer">
									<User size={14} /> Guests
								</button>
								<button
									onClick={() => navigate(`/admin/events/${event.id}/sponsors`)}
									className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md text-sm flex items-center gap-1 cursor-pointer">
									<Star size={14} /> Sponsors
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default Events;
