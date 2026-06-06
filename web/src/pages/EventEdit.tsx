import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft, Trash2, Calendar, MapPin, Tag, Mail, Image as ImageIcon } from 'lucide-react';
import { getImagePath } from '@/utils/imagePath';

const EventEdit = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const token = localStorage.getItem('token');
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [event, setEvent] = useState({
		name: '',
		city: '',
		country: '',
		date: '',
		status: 'not active',
		logo: '',
		email_template: ''
	});

	const isNew = id === 'new' || !id;

	useEffect(() => {
		if (!isNew) {
			fetchEvent();
		} else {
			setLoading(false);
		}
	}, [id]);

	const fetchEvent = async () => {
		try {
			const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const currentEvent = res.data.find((e: any) => e.id === parseInt(id || '0'));
			if (currentEvent) {
				// Format date for input type="date"
				if (currentEvent.date) {
					currentEvent.date = new Date(currentEvent.date).toISOString().split('T')[0];
				}
				setEvent(currentEvent);
			} else {
				alert('Event not found');
				navigate('/admin');
			}
		} catch (err) {
			console.error(err);
			alert('Error fetching event');
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isNew) {
				await axios.post(
					`${import.meta.env.VITE_API_URL}/api/admin/events`,
					event,
					{
						headers: { Authorization: `Bearer ${token}` }
					});
			} else {
				await axios.put(
					`${import.meta.env.VITE_API_URL}/api/admin/events/${id}`,
					event,
					{ headers: { Authorization: `Bearer ${token}` } }
				);
			}
			navigate('/admin');
		} catch (err) {
			console.error(err);
			alert(`Error ${isNew ? 'creating' : 'updating'} event`);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
		setEvent({ ...event, [e.target.name]: e.target.value });
	};

	const insertPlaceholder = (placeholder: string) => {
		if (!textareaRef.current) return;

		const textarea = textareaRef.current;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = event.email_template || '';

		const newText = text.substring(0, start) + placeholder + text.substring(end);

		setEvent({ ...event, email_template: newText });

		// Focus back and set cursor position after the inserted placeholder
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
		}, 0);
	};

	if (loading) return <div className="p-8">Loading...</div>;

	return (
		<div className="max-w-4xl mx-auto space-y-6 pb-12">
			<div className="flex justify-between items-center">
				<button
					onClick={() => navigate('/admin')}
					className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors"
				>
					<ArrowLeft size={20} /> Back to Events
				</button>
				<h2 className="text-2xl font-bold text-secondary">{isNew ? 'Create Event' : 'Edit Event'}</h2>
			</div>

			<form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
				<div className="p-8 space-y-8">
					{/* Logo Section */}
					<div className="flex flex-col md:flex-row gap-8 items-start">
						<div className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
							{event.logo ? (
								<img src={getImagePath(event.logo, 'events')} alt="Event logo" className="w-full h-full object-cover" />
							) : (
								<ImageIcon size={40} className="text-gray-300" />
							)}
						</div>
						<div className="flex-1 space-y-2 w-full">
							<label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
								<ImageIcon size={16} /> Event Logo
							</label>
							<div className="flex flex-col gap-2">
								<input
									type="file"
									accept="image/*"
									onChange={async (e) => {
										const file = e.target.files?.[0];
										if (!file) return;

										const formData = new FormData();
										formData.append('file', file);

										try {
											setUploading(true);
											const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload?folder=events`, formData, {
												headers: {
													'Content-Type': 'multipart/form-data',
													Authorization: `Bearer ${token}`
												}
											});
											setEvent({ ...event, logo: res.data.url });
										} catch (err) {
											alert('Error uploading image');
										} finally {
											setUploading(false);
										}
									}}
									className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 transition-all"
								/>
								{uploading && <p className="text-xs text-primary animate-pulse">Uploading...</p>}
								<p className="text-xs text-slate-400 italic">Select an image to upload as the event logo (PNG, square image).</p>
							</div>
						</div>
					</div>

					<div className="pt-2">
						<label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
							<Tag size={16} /> Event Status
						</label>
						<div className="flex flex-wrap gap-4">
							{[
								{ id: 'not active', label: 'Not Active', color: 'bg-slate-400', ring: 'ring-slate-400/20' },
								{ id: 'active', label: 'Active', color: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
								{ id: 'completed', label: 'Completed', color: 'bg-orange-500', ring: 'ring-orange-500/20' }
							].map((status) => (
								<label
									key={status.id}
									className={`
												relative flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer transition-all border-2
												${event.status === status.id
											? `border-transparent ${status.color} text-white shadow-lg ${status.ring} ring-4`
											: 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'}
											`}
								>
									<input
										type="radio"
										name="status"
										value={status.id}
										checked={event.status === status.id}
										onChange={() => setEvent({ ...event, status: status.id })}
										className="sr-only"
									/>
									<div className={`w-2 h-2 rounded-full ${event.status === status.id ? 'bg-white' : status.color}`} />
									<span className="font-bold text-sm tracking-tight">{status.label}</span>
								</label>
							))}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Name */}
						<div className="space-y-2 col-span-2">
							<label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
								<Tag size={16} /> Event Name
							</label>
							<input
								type="text"
								name="name"
								required
								value={event.name}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
							/>
						</div>



						{/* Date */}
						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
								<Calendar size={16} /> Date
							</label>
							<input
								type="date"
								name="date"
								value={event.date || ''}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
							/>
						</div>

						{/* City */}
						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
								<MapPin size={16} /> City
							</label>
							<input
								type="text"
								name="city"
								value={event.city || ''}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
							/>
						</div>

						{/* Country */}
						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
								<MapPin size={16} /> Country
							</label>
							<input
								type="text"
								name="country"
								value={event.country || ''}
								onChange={handleChange}
								className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
							/>
						</div>
					</div>

					<div className="space-y-3">
						<label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
							<Mail size={16} /> Email Template (HTML)
						</label>
						<textarea
							ref={textareaRef}
							name="email_template"
							value={event.email_template || ''}
							onChange={handleChange}
							rows={8}
							className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono text-sm"
							placeholder="<h1>Hello {{guest_name}}!</h1>..."
						></textarea>

						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => insertPlaceholder('{{guest_name}}')}
								className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors border border-slate-200"
							>
								+ Guest Name
							</button>
							<button
								type="button"
								onClick={() => insertPlaceholder('{{event_name}}')}
								className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors border border-slate-200"
							>
								+ Event Name
							</button>
							<button
								type="button"
								onClick={() => insertPlaceholder('{{event_city}}, {{event_country}}')}
								className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors border border-slate-200"
							>
								+ Event Location
							</button>
							<button
								type="button"
								onClick={() => insertPlaceholder('{{event_date}}')}
								className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors border border-slate-200"
							>
								+ Event Date
							</button>
						</div>
						<p className="text-xs text-slate-400">Click the buttons above to insert placeholders at the cursor position.</p>
					</div>
				</div>

				<div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
					{!isNew ? (
						<button
							type="button"
							className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium transition-colors"
							onClick={() => alert('Delete functionality not implemented yet')}
						>
							<Trash2 size={18} /> Delete Event
						</button>
					) : <div></div>}
					<button
						type="submit"
						className="btn-primary flex items-center gap-2 px-8"
					>
						<Save size={18} /> {isNew ? 'Create Event' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default EventEdit;
