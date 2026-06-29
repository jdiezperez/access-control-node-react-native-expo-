import React, { useState, useEffect } from 'react';
import { X, Loader2, Copy } from 'lucide-react';
import axios from 'axios';

interface Template {
	id: number;
	name: string;
}

interface FieldTemplateSelectorProps {
	eventId: string;
	onClose: () => void;
	onCopied: () => void;
}

const FieldTemplateSelector: React.FC<FieldTemplateSelectorProps> = ({ eventId, onClose, onCopied }) => {
	const token = localStorage.getItem('token');
	const [templates, setTemplates] = useState<Template[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [copying, setCopying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchTemplates();
	}, [eventId]);

	const fetchTemplates = async () => {
		try {
			setLoading(true);
			const res = await axios.get(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/field-templates`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			setTemplates(res.data);
		} catch (err) {
			console.error(err);
			setError('Failed to load templates');
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = async () => {
		if (!selectedId) {
			setError('Please select a template');
			return;
		}

		if (!window.confirm('This action will delete existing fields')) {
			return;
		}

		try {
			setCopying(true);
			setError(null);
			await axios.post(
				`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/copy-fields`,
				{ sourceEventId: selectedId },
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			onCopied();
			onClose();
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to copy fields');
		} finally {
			setCopying(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
					<div className="flex flex-col">
						<h3 className="text-xl font-bold text-slate-800">Copy Fields from Event</h3>
						<p className="text-xs text-slate-500">Select an event to use its fields template</p>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 transition-colors"
					>
						<X size={24} />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-8 space-y-4">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="animate-spin text-blue-600" size={32} />
						</div>
					) : templates.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-slate-600">No events with custom fields found in your company</p>
						</div>
					) : (
						<div className="space-y-3">
							{templates.map(template => (
								<label
									key={template.id}
									className={`
										relative flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all border
										${selectedId === template.id
											? 'border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/20'
											: 'border-slate-200 bg-white hover:border-slate-300'}
									`}
								>
									<input
										type="radio"
										name="template"
										value={template.id}
										checked={selectedId === template.id}
										onChange={(e) => setSelectedId(parseInt(e.target.value))}
										className="sr-only"
									/>
									<div className={`w-4 h-4 rounded-full border-2 ${selectedId === template.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`} />
									<span className="font-semibold text-slate-800">{template.name}</span>
								</label>
							))}
						</div>
					)}

					{selectedId && (
						<div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
							This action will delete existing fields
						</div>
					)}

					{error && (
						<div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
							{error}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-8 py-6 border-t border-gray-100 flex gap-3 bg-slate-50/50">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold text-sm"
					>
						Cancel
					</button>
					<button
						onClick={handleCopy}
						disabled={!selectedId || copying}
						className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
					>
						<Copy size={16} />
						{copying ? 'Copying...' : 'Copy Fields'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default FieldTemplateSelector;
