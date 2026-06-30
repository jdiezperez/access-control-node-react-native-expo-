import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Save, ArrowLeft, Trash2, Calendar, MapPin, Tag, Mail, Image as ImageIcon, Loader2, Copy, AlertTriangle } from 'lucide-react';
import { getImagePath } from '@/utils/imagePath';
import CountrySelect from '@/components/CountrySelect';
import EventFieldsBuilder from '@/components/EventFieldsBuilder';
import FieldTemplateSelector from '@/components/FieldTemplateSelector';

const EventEdit = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
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
	const [showTemplateSelector, setShowTemplateSelector] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [fieldsRefresh, setFieldsRefresh] = useState(0);
	const state = location.state as { tab?: string } | null;
	//	const [activeTab, setActiveTab] = useState<'info' | 'fields'>(() => state?.tab === 'fields' && !isNew ? 'fields' : 'info'
	const [activeTab, setActiveTab] = useState<'info' | 'fields'>('info');

	useEffect(() => {
		if (!isNew && location.state?.tab === 'fields') {
			setActiveTab('fields');
		} else if (isNew) {
			setActiveTab('info');
		}
	}, [id, isNew, location.state]);

	useEffect(() => {
		const load = async () => {
			if (id && id !== 'new') {
				try {
					const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events`, {
						headers: { Authorization: `Bearer ${token}` }
					});
					const currentEvent = res.data.find((e: { id: number }) => e.id === parseInt(id || '0'));
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
			} else {
				setLoading(false);
			}
		};
		load();
	}, [id, navigate, token]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isNew) {
				const res = await axios.post(
					`${import.meta.env.VITE_API_URL}/api/admin/events`,
					event,
					{
						headers: { Authorization: `Bearer ${token}` }
					});
				// Navigate to the new event with fields tab selected
				navigate(`/admin/events/${res.data.id}`, { state: { tab: 'fields' } });
			} else {
				await axios.put(
					`${import.meta.env.VITE_API_URL}/api/admin/events/${id}`,
					event,
					{ headers: { Authorization: `Bearer ${token}` } }
				);
				navigate('/admin');
			}
		} catch (err) {
			console.error(err);
			alert(`Error ${isNew ? 'creating' : 'updating'} event`);
		}
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${id}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			navigate('/admin');
		} catch (err) {
			console.error(err);
			alert('Failed to delete event. Please try again.');
			setDeleting(false);
			setShowDeleteConfirm(false);
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="animate-spin text-primary" size={40} />
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6 pb-12">
			{/* Back Button & Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<button
					onClick={() => navigate('/admin')}
					className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold w-fit"
				>
					<ArrowLeft size={16} /> Back to Events
				</button>
				<h2 className="text-3xl font-black text-white tracking-tight">{isNew ? 'Create Event' : 'Edit Event'}</h2>
			</div>

			{/* Form Container */}
			<div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
				{/* Tab Buttons */}
				<div className="flex border-b border-white/10 bg-white/5">
					<button
						onClick={() => setActiveTab('info')}
						className={`flex-1 px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'info'
							? 'text-white border-b-2 border-blue-500'
							: 'text-slate-400 hover:text-slate-300'
							}`}
					>
						Event Info
					</button>
					{!isNew && (
						<button
							onClick={() => setActiveTab('fields')}
							disabled={event.status !== 'not active'}
							title={event.status !== 'not active' ? 'Cannot edit Guest Data when event is Active or Completed' : ''}
							className={`flex-1 px-6 py-4 text-sm font-semibold transition-all border-l border-white/10 ${activeTab === 'fields'
								? 'text-white border-b-2 border-blue-500'
								: 'text-slate-400 hover:text-slate-300'
								} ${event.status !== 'not active' ? 'opacity-50 cursor-not-allowed' : ''}`}
						>
							Guest Data
						</button>
					)}
				</div>

				<form onSubmit={handleSubmit} className="p-8 space-y-8">
					{activeTab === 'info' && (
						<>
							{/* Status Section */}
							<div className="pb-4 border-b border-white/5">
								<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
									<Tag size={14} className="text-primary" /> Event Status
								</label>
								<div className="flex flex-wrap gap-4">
									{[
										{ id: 'not active', label: 'Not Active', color: 'bg-white/10 text-slate-300 border-white/10', ring: 'ring-white/10' },
										{ id: 'active', label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', ring: 'ring-emerald-500/20' },
										{ id: 'completed', label: 'Completed', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', ring: 'ring-orange-500/20' }
									].map((status) => (
										<label
											key={status.id}
											className={`
										relative flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer transition-all border
										${event.status === status.id
													? `${status.color} ring-4 ${status.ring}`
													: 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'}
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
											<div className={`w-2.5 h-2.5 rounded-full ${event.status === status.id ? 'bg-current' : 'bg-slate-600'}`} />
											<span className="font-bold text-sm tracking-tight">{status.label}</span>
										</label>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Name */}
								<div className="space-y-2 col-span-2">
									<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
										<Tag size={14} className="text-primary" /> Event Name <span className="text-red-400">*</span>
									</label>
									<input
										type="text"
										name="name"
										required
										value={event.name}
										onChange={handleChange}
										className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
										style={{ background: 'rgba(255,255,255,0.03)' }}
									/>
								</div>

								{/* Logo Section */}
								<div className="flex flex-col md:flex-row gap-8 items-start pb-6 border-b border-white/5">
									<div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center overflow-hidden border border-white/10 p-2 shrink-0">
										{event.logo ? (
											<img src={getImagePath(event.logo, 'events')} alt="Event logo" className="w-full h-full object-contain" />
										) : (
											<ImageIcon size={40} className="text-slate-400" />
										)}
									</div>
									<div className="flex-1 space-y-2 w-full">
										<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
											<ImageIcon size={14} className="text-primary" /> Event Logo
										</label>
										<div className="flex flex-col gap-2">
											<input
												type="file"
												accept="image/*"
												onChange={async (e) => {
													const file = e.target.files?.[0];
													if (!file) return;

													const resizeImageToBlob = (file: File, maxWidth = 500): Promise<Blob> =>
														new Promise((resolve, reject) => {
															const img = new window.Image();
															const url = URL.createObjectURL(file);
															img.onload = () => {
																URL.revokeObjectURL(url);
																const scale = img.width > maxWidth ? maxWidth / img.width : 1;
																const canvas = document.createElement('canvas');
																canvas.width = Math.round(img.width * scale);
																canvas.height = Math.round(img.height * scale);
																canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
																canvas.toBlob(
																	blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
																	'image/jpeg',
																	0.85
																);
															};
															img.onerror = reject;
															img.src = url;
														});

													try {
														setUploading(true);
														const resized = await resizeImageToBlob(file);
														const formData = new FormData();
														formData.append('file', resized, file.name.replace(/\.[^.]+$/, '.jpg'));

														const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload?folder=events`, formData, {
															headers: {
																'Content-Type': 'multipart/form-data',
																Authorization: `Bearer ${token}`
															}
														});
														setEvent({ ...event, logo: res.data.url });
													} catch (err: unknown) {
														alert('Error uploading image, ' + (err as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (err as { message?: string }).message);
													} finally {
														setUploading(false);
													}
												}}
												className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:opacity-90 file:cursor-pointer"
											/>
											{uploading && <p className="text-xs text-primary animate-pulse">Uploading...</p>}
											<p className="text-xs text-slate-500 italic">Select an image to upload as the event logo (PNG, square image). Resized to 500px wide.</p>
										</div>
									</div>
								</div>

								{/* Date */}
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
										<Calendar size={14} className="text-white" /> Date <span className="text-red-400">*</span>
									</label>
									<input
										type="date"
										name="date"
										required
										value={event.date || ''}
										onChange={handleChange}
										className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
										style={{ background: 'rgba(255,255,255,0.03)' }}
									/>
								</div>

								{/* City */}
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
										<MapPin size={14} className="text-primary" /> City <span className="text-red-400">*</span>
									</label>
									<input
										type="text"
										name="city"
										required
										value={event.city || ''}
										onChange={handleChange}
										className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
										style={{ background: 'rgba(255,255,255,0.03)' }}
									/>
								</div>

								{/* Country */}
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
										<MapPin size={14} className="text-primary" /> Country <span className="text-red-400">*</span>
									</label>
									<CountrySelect
										value={event.country || ''}
										onChange={v => setEvent({ ...event, country: v })}
										required
										className="w-full px-4 pt-3 pb-4 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 bg-[#293143]"
										style={{ background: 'rgba(255,255,255,0.03)' }}
									/>
								</div>
							</div>

							{/* Email Template Section */}

							<div className="space-y-3">
								<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
									<Mail size={14} className="text-primary" /> Email Template (HTML)
								</label>
								<textarea
									ref={textareaRef}
									name="email_template"
									value={event.email_template || ''}
									onChange={handleChange}
									rows={8}
									className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
									style={{ background: 'rgba(255,255,255,0.03)' }}
									placeholder="<h1>Hello {{guest_name}}!</h1>..."
								></textarea>

								<div className="flex flex-wrap gap-2">
									{[
										{ label: '+ Guest Name', placeholder: '{{guest_name}}' },
										{ label: '+ Event Name', placeholder: '{{event_name}}' },
										{ label: '+ Event Location', placeholder: '{{event_city}}, {{event_country}}' },
										{ label: '+ Event Date', placeholder: '{{event_date}}' }
									].map((item) => (
										<button
											key={item.label}
											type="button"
											onClick={() => insertPlaceholder(item.placeholder)}
											className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-colors"
										>
											{item.label}
										</button>
									))}
								</div>
								<p className="text-xs text-slate-500">Click the buttons above to insert placeholders at the cursor position.</p>
							</div>
						</>
					)}

					{/* Guest Data Tab */}
					{activeTab === 'fields' && !isNew && (
						<>
							<div className="flex items-center justify-between mb-4">
								<label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
									<Tag size={14} className="text-primary" /> Custom Guest Fields
								</label>
								<button
									type="button"
									onClick={() => setShowTemplateSelector(true)}
									className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-blue-400 hover:text-blue-300 text-xs font-semibold border border-blue-500/30 hover:border-blue-500/50 transition-colors"
								>
									<Copy size={14} /> Copy from Template
								</button>
							</div>
							<EventFieldsBuilder
								eventId={id || null}
								onFieldsSaved={() => setFieldsRefresh(prev => prev + 1)}
								refreshTrigger={fieldsRefresh}
							/>
						</>
					)}

					<div className="px-8 py-4 border-t border-white/5 flex justify-between items-center bg-black/10">
						{(!isNew && activeTab === 'info') ? (
							<button
								type="button"
								className="flex items-center gap-2 text-red-400 hover:text-red-500 text-sm font-semibold transition-colors"
								onClick={() => setShowDeleteConfirm(true)}
							>
								<Trash2 size={16} /> Delete Event
							</button>
						) : <div></div>}
						<button
							type="submit"
							className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
							style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
						>
							<Save size={16} /> {isNew ? 'Create Event' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>

			{/* Template Selector Modal */}
			{showTemplateSelector && (
				<FieldTemplateSelector
					eventId={id || ''}
					onClose={() => setShowTemplateSelector(false)}
					onCopied={() => {
						setFieldsRefresh(prev => prev + 1);
						setShowTemplateSelector(false);
					}}
				/>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
					<div className="w-full max-w-md rounded-3xl border border-red-500/20 p-8 space-y-6 shadow-2xl" style={{ background: 'rgba(20,10,10,0.95)' }}>
						{/* Icon + Title */}
						<div className="flex flex-col items-center gap-4 text-center">
							<div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
								<AlertTriangle size={32} className="text-red-400" />
							</div>
							<div>
								<h3 className="text-xl font-black text-white mb-1">Delete Event?</h3>
								<p className="text-slate-400 text-sm font-semibold">{event.name}</p>
							</div>
						</div>

						{/* Warning box */}
						<div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
							<p className="text-red-400 text-xs font-bold uppercase tracking-widest">This action is permanent and cannot be undone.</p>
							<p className="text-slate-300 text-sm">Deleting this event will permanently remove:</p>
							<ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
								<li>All guests and their registration data</li>
								<li>All assigned users</li>
								<li>All linked sponsors</li>
								<li>All custom fields</li>
								<li>The event logo image</li>
							</ul>
						</div>

						{/* Actions */}
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => setShowDeleteConfirm(false)}
								disabled={deleting}
								className="flex-1 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-slate-300 font-bold text-sm hover:bg-white/10 transition-all disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={deleting}
								className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all disabled:opacity-50"
							>
								{deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
								{deleting ? 'Deleting…' : 'Yes, Delete Event'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EventEdit;
