import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, MapPin, Plus, Image as ImageIcon, Star, User, Loader2, CalendarDays, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImagePath } from '@/utils/imagePath';

const Events = () => {
	const [events, setEvents] = useState<any[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [showNotActive, setShowNotActive] = useState<boolean>(true);
	const [showActive, setShowActive] = useState<boolean>(true);
	const [showCompleted, setShowCompleted] = useState<boolean>(true);

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
			case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
			case 'completed': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
			case 'not active': return 'bg-white/5 text-slate-400 border-white/10';
			default: return 'bg-white/5 text-slate-400 border-white/10';
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="animate-spin text-primary" size={40} />
			</div>
		);
	}
	const filteredEvents = events.filter(event => {
		const showNotActiveMatch = showNotActive && event.status === 'not active';
		const showActiveMatch = showActive && event.status === 'active';
		const showCompletedMatch = showCompleted && event.status === 'completed';
		return showNotActiveMatch || showActiveMatch || showCompletedMatch;
	});

	console.log(filteredEvents);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<div
						className="p-4 rounded-3xl shadow-lg shadow-blue-2500/20"
						style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
					>
						<CalendarDays size={32} className="text-white" />
					</div>
					<div>
						<h1 className="text-3xl font-black text-white tracking-tight">Events</h1>
						<p className="text-slate-400 font-medium mt-0.5">
							{events.length} {events.length === 1 ? 'event' : 'events'} managed
						</p>
					</div>
				</div>
				<button
					id="btn-create-event"
					onClick={handleCreateEvent}
					className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
					style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
				>
					<Plus size={20} /> New Event
				</button>
			</div>
			{/* Status Section */}
			<div className="pb-4 border-b border-white/5">
				<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
					<Tag size={14} className="text-primary" /> Show Events
				</label>
				<div className="flex flex-wrap gap-4">
					<label
						className={`
							relative flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer transition-all border
							${showNotActive
								? 'bg-white/10 text-slate-300 border-white/10 ring-4 ring-white/10'
								: 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
							}
						`}
					>
						<input
							type="checkbox"
							name="status"
							value="not active"
							checked={showNotActive}
							onChange={() => setShowNotActive(!showNotActive)}
							className="sr-only"
						/>
						<div className={`w-2.5 h-2.5 rounded-full ${showNotActive ? 'bg-current' : 'bg-slate-600'}`} />
						<span className="font-bold text-sm tracking-tight">Not Active</span>
					</label>

					<label
						className={`
							relative flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer transition-all border
							${showActive
								? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-emerald-500/20'
								: 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
							}
						`}
					>
						<input
							type="checkbox"
							name="status"
							value="active"
							checked={showActive}
							onChange={() => setShowActive(!showActive)}
							className="sr-only"
						/>
						<div className={`w-2.5 h-2.5 rounded-full ${showActive ? 'bg-current' : 'bg-slate-600'}`} />
						<span className="font-bold text-sm tracking-tight">Active</span>
					</label>

					<label
						className={`
							relative flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer transition-all border
							${showCompleted
								? 'bg-orange-500/20 text-orange-400 border-orange-500/30 ring-orange-500/20'
								: 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
							}
						`}
					>
						<input
							type="checkbox"
							name="status"
							value="completed"
							checked={showCompleted}
							onChange={() => setShowCompleted(!showCompleted)}
							className="sr-only"
						/>
						<div className={`w-2.5 h-2.5 rounded-full ${showCompleted ? 'bg-current' : 'bg-slate-600'}`} />
						<span className="font-bold text-sm tracking-tight">Completed</span>
					</label>
				</div>
			</div>
			{filteredEvents.length === 0 ? (
				<div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-3xl border border-white/10 p-12" style={{ background: 'rgba(255,255,255,0.03)' }}>
					<div className="p-5 rounded-3xl" style={{ background: 'rgba(59,130,246,0.15)' }}>
						<Calendar size={40} className="text-primary" />
					</div>
					<div className="text-center">
						<p className="text-white font-bold text-lg">No events found</p>
						<p className="text-slate-500 text-sm mt-1">Create your first event to get started.</p>
					</div>
					<button
						onClick={handleCreateEvent}
						className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90"
						style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
					>
						<Plus size={18} /> Create Event
					</button>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredEvents.map(event => (
							<div
								key={event.id}
								className="rounded-3xl border border-white/10 flex flex-col justify-between overflow-hidden hover:border-blue-500/30 transition-all group"
								style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
							>
								{/* Card Header & Body */}
								<div className="p-6 space-y-4">
									<div className="cursor-pointer" onClick={() => navigate(`/admin/events/${event.id}`)}>
										<h3 className="text-lg font-black text-white group-hover:text-primary transition-colors line-clamp-1">{event.name}</h3>
									</div>

									<div className="flex gap-4">
										{/* Logo Left */}
										<div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
											{event.logo ? (
												<img src={getImagePath(event.logo, 'events')} alt={event.name} className="w-full h-full object-cover" />
											) : (
												<div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
													<ImageIcon className="text-white" size={24} />
												</div>
											)}
										</div>

										{/* Info Right */}
										<div className="flex flex-col justify-center space-y-1.5 text-slate-400">
											<div className="flex items-center gap-2 text-sm">
												<Calendar size={13} className="text-primary" />
												<span>{event.date ? new Date(event.date).toLocaleDateString() : 'Date not set'}</span>
											</div>
											<div className="flex items-center gap-2 text-sm">
												<MapPin size={13} className="text-primary" />
												<span className="truncate max-w-[150px]">
													{event.city && event.country ? `${event.city}, ${event.country}` : event.city || event.country || 'Location not set'}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Card Footer */}
								<div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-black/10">
									<div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(event.status)}`}>
										{event.status?.toUpperCase() || 'ACTIVE'}
									</div>
									<div className='flex gap-2'>
										<button
											onClick={() => navigate(`/admin/events/${event.id}/guests`)}
											className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 text-xs font-semibold transition-all cursor-pointer">
											<User size={13} /> Guests
										</button>
										<button
											onClick={() => navigate(`/admin/events/${event.id}/sponsors`)}
											className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 text-xs font-semibold transition-all cursor-pointer">
											<Star size={13} /> Sponsors
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default Events;
