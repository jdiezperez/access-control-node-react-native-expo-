import React, { useState, useEffect } from 'react';
import { Plus, X, GripVertical, ChevronDown, Loader2 } from 'lucide-react';
import axios from 'axios';
import FieldTypeSelector from './FieldTypeSelector';

interface Field {
	id?: number;
	field_name: string;
	field_type: string;
	field_values?: string;
	required?: boolean;
	field_order?: number;
}

interface EventFieldsBuilderProps {
	eventId: string | null;
	onFieldsSaved?: () => void;
	refreshTrigger?: number;
}

const EventFieldsBuilder: React.FC<EventFieldsBuilderProps> = ({ eventId, onFieldsSaved, refreshTrigger = 0 }) => {
	const token = localStorage.getItem('token');
	const [fields, setFields] = useState<Field[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [newField, setNewField] = useState<Field>({
		field_name: '',
		field_type: 'text',
		field_values: '',
		required: false
	});
	const [error, setError] = useState<string | null>(null);
	const [draggedId, setDraggedId] = useState<number | null>(null);

	useEffect(() => {
		if (eventId) {
			fetchFields();
		}
	}, [eventId, refreshTrigger]);

	const fetchFields = async () => {
		if (!eventId) return;
		try {
			setLoading(true);
			const res = await axios.get(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			setFields(res.data);
		} catch (err) {
			console.error(err);
			setError('Failed to load fields');
		} finally {
			setLoading(false);
		}
	};

	const handleAddField = async () => {
		if (!newField.field_name || !newField.field_type) {
			setError('Field name and type are required');
			return;
		}

		if (newField.field_type === 'options' && !newField.field_values) {
			setError('Please add at least one option value');
			return;
		}

		if (!eventId) return;

		try {
			setSaving(true);
			setError(null);
			const res = await axios.post(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields`,
				{
					field_name: newField.field_name,
					field_type: newField.field_type,
					field_values: newField.field_values || null,
					required: newField.required
				},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setFields([
				...fields,
				{
					id: res.data.id,
					...newField,
					field_order: fields.length
				}
			]);

			setNewField({
				field_name: '',
				field_type: 'text',
				field_values: '',
				required: false
			});
			setShowAddForm(false);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to add field');
		} finally {
			setSaving(false);
		}
	};

	const handleUpdateField = async (id: number) => {
		const field = fields.find(f => f.id === id);
		if (!field) return;

		if (!field.field_name || !field.field_type) {
			setError('Field name and type are required');
			return;
		}

		if (field.field_type === 'options' && !field.field_values) {
			setError('Please add at least one option value');
			return;
		}

		if (!eventId) return;

		try {
			setSaving(true);
			setError(null);
			await axios.put(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields/${id}`,
				{
					field_name: field.field_name,
					field_type: field.field_type,
					field_values: field.field_values || null,
					required: field.required
				},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setEditingId(null);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to update field');
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteField = async (id: number) => {
		if (!eventId || !confirm('Delete this field?')) return;

		try {
			setSaving(true);
			setError(null);
			await axios.delete(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields/${id}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setFields(fields.filter(f => f.id !== id));
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to delete field');
		} finally {
			setSaving(false);
		}
	};

	const handleDragStart = (id: number) => {
		setDraggedId(id);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = async (targetId: number) => {
		if (!draggedId || draggedId === targetId || !eventId) return;

		const draggedIndex = fields.findIndex(f => f.id === draggedId);
		const targetIndex = fields.findIndex(f => f.id === targetId);

		if (draggedIndex === -1 || targetIndex === -1) return;

		const newFields = [...fields];
		[newFields[draggedIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[draggedIndex]];

		setFields(newFields);
		setDraggedId(null);

		try {
			const fieldOrder = newFields.map(f => f.id).filter((id): id is number => id !== undefined);
			await axios.post(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields/reorder`,
				{ fieldOrder },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
		} catch (err) {
			console.error(err);
			fetchFields(); // Revert to server state
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="animate-spin text-primary" size={24} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Error Message */}
			{error && (
				<div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
					{error}
				</div>
			)}

			{/* Fields List */}
			<div className="space-y-3">{newField.field_type}
				{fields.length === 0 ? (
					<div className="text-center py-8 text-slate-400">
						<p className="text-sm">No custom fields yet</p>
					</div>
				) : (
					fields.map((field, index) => (
						<div
							key={field.id}
							draggable
							onDragStart={() => handleDragStart(field.id!)}
							onDragOver={handleDragOver}
							onDrop={() => handleDrop(field.id!)}
							className={`
								p-4 rounded-lg border transition-all cursor-move
								${draggedId === field.id
									? 'border-blue-500/50 bg-blue-500/10 opacity-50'
									: 'border-white/10 bg-white/5 hover:border-white/20'}
								${editingId === field.id ? 'ring-2 ring-blue-500/30' : ''}
							`}
						>
							<div className="flex items-start gap-4">
								<GripVertical size={18} className="text-slate-500 mt-1 shrink-0" />

								{editingId === field.id ? (
									// Edit Mode
									<div className="flex-1 space-y-4">
										<input
											type="text"
											value={field.field_name}
											onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, field_name: e.target.value } : f))}
											placeholder="Field name"
											className="w-full px-3 py-2 rounded-lg border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
											style={{ background: 'rgba(255,255,255,0.03)' }}
										/>

										<FieldTypeSelector
											fieldType={field.field_type}
											fieldValues={field.field_values}
											onTypeChange={(type) => setFields(fields.map(f => f.id === field.id ? { ...f, field_type: type } : f))}
											onValuesChange={(values) => setFields(fields.map(f => f.id === field.id ? { ...f, field_values: values } : f))}
										/>

										<label className="flex items-center gap-2 text-white cursor-pointer">
											<input
												type="checkbox"
												checked={field.required || false}
												onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, required: e.target.checked } : f))}
												className="rounded"
											/>
											<span className="text-sm font-medium">Required field</span>
										</label>

										<div className="flex gap-2">
											<button
												onClick={() => handleUpdateField(field.id!)}
												disabled={saving}
												className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
											>
												{saving ? 'Saving...' : 'Save'}
											</button>
											<button
												onClick={() => setEditingId(null)}
												className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
											>
												Cancel
											</button>
										</div>
									</div>
								) : (
									// View Mode
									<div className="flex-1">
										<div className="font-semibold text-white text-sm">{field.field_name}</div>
										<div className="text-xs text-slate-400 mt-1">
											Type: <span className="text-slate-300">{field.field_type}</span>
											{field.required && <span className="ml-3 text-blue-400">• Required</span>}
										</div>
										{field.field_type === 'options' && field.field_values && (
											<div className="text-xs text-slate-400 mt-2">
												Options: <span className="text-slate-300">{field.field_values.split('|').join(', ')}</span>
											</div>
										)}
									</div>
								)}

								{editingId !== field.id && (
									<div className="flex gap-2 shrink-0">
										<button
											onClick={() => setEditingId(field.id!)}
											className="px-3 py-1 rounded-lg border border-white/10 text-white hover:bg-white/10 text-xs font-semibold transition-colors"
										>
											Edit
										</button>
										<button
											onClick={() => handleDeleteField(field.id!)}
											disabled={saving}
											className="p-1 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
										>
											<X size={16} />
										</button>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>

			{/* Add New Field Form */}
			{showAddForm ? (
				<div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-4">
					<h4 className="font-semibold text-white">Add New Field</h4>

					<input
						type="text"
						value={newField.field_name}
						onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
						placeholder="Field name"
						className="w-full px-3 py-2 rounded-lg border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
						style={{ background: 'rgba(255,255,255,0.03)' }}
					/>

					<FieldTypeSelector
						fieldType={newField.field_type}
						fieldValues={newField.field_values}
						onTypeChange={(type) => { setNewField(prev => ({ ...prev, field_type: type })); }}
						onValuesChange={(values) => { setNewField(prev => ({ ...prev, field_values: values })); }}
					/>

					<label className="flex items-center gap-2 text-white cursor-pointer">
						<input
							type="checkbox"
							checked={newField.required || false}
							onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
							className="rounded"
						/>
						<span className="text-sm font-medium">Required field</span>
					</label>

					<div className="flex gap-2">
						<button
							onClick={handleAddField}
							disabled={saving}
							className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
						>
							{saving ? 'Adding...' : 'Add Field'}
						</button>
						<button
							onClick={() => {
								setShowAddForm(false);
								setError(null);
							}}
							className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<button
					onClick={() => setShowAddForm(true)}
					className="w-full px-4 py-3 rounded-lg border border-dashed border-white/30 bg-white/5 hover:bg-white/10 text-white transition-colors flex items-center justify-center gap-2"
				>
					<Plus size={18} />
					<span className="font-semibold text-sm">Add Custom Field</span>
				</button>
			)}
		</div>
	);
};

export default EventFieldsBuilder;
