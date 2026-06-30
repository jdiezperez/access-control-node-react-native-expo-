import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FieldTypeSelectorProps {
	fieldType: string;
	fieldValues?: string;
	onTypeChange: (type: string) => void;
	onValuesChange: (values: string) => void;
}

const FieldTypeSelector: React.FC<FieldTypeSelectorProps> = ({
	fieldType,
	fieldValues,
	onTypeChange,
	onValuesChange
}) => {
	const [options, setOptions] = useState<string[]>(
		fieldValues ? fieldValues.split('|').filter(v => v.trim()) : []
	);
	const [newOption, setNewOption] = useState('');

	const fieldTypes = [
		{ id: 'text', label: 'Text', description: 'Single line text input' },
		{ id: 'number', label: 'Number', description: 'Numeric input' },
		{ id: 'yes/no', label: 'Yes/No', description: 'Boolean choice' },
		{ id: 'options', label: 'Options', description: 'Multiple choice dropdown' },
		{ id: 'date', label: 'Date', description: 'Date picker' }
	];

	const handleAddOption = () => {
		if (newOption.trim()) {
			const updated = [...options, newOption.trim()];
			setOptions(updated);
			onValuesChange(updated.join('|'));
			setNewOption('');
		}
	};

	const handleRemoveOption = (index: number) => {
		const updated = options.filter((_, i) => i !== index);
		setOptions(updated);
		onValuesChange(updated.join('|'));
	};

	const handleTypeChange = (newType: string) => {
		onTypeChange(newType);
		if (newType !== 'options') {
			setOptions([]);
			onValuesChange('');
		}
	};

	return (
		<div className="space-y-4">
			{/* Type Selector */}
			<div>
				<label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">
					Field Type
				</label>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{fieldTypes.map(type => (
						<label
							key={type.id}
							className={`
								relative flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border
								${fieldType === type.id
									? 'border-blue-500/50 bg-blue-500/10 text-white ring-2 ring-blue-500/20'
									: 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}
							`}
						>
							<input
								type="radio"
								value={type.id}
								checked={fieldType === type.id}
								onChange={(e) => handleTypeChange(e.target.value)}
								className="sr-only"
							/>
							<div className={`w-4 h-4 rounded-full border-2 mt-0.5 ${fieldType === type.id ? 'border-blue-400 bg-blue-400' : 'border-slate-500'}`} />
							<div>
								<div className="font-semibold text-sm">{type.label}</div>
								<div className="text-xs text-slate-400">{type.description}</div>
							</div>
						</label>
					))}
				</div>
			</div>

			{/* Options Input (only for 'options' type) */}
			{fieldType === 'options' && (
				<div className="p-4 rounded-xl border border-white/10 bg-white/5">
					<label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">
						Option Values
					</label>

					{/* Option List */}
					<div className="space-y-2 mb-4">
						{options.map((option, index) => (
							<div key={index} className="flex items-center justify-between px-3 py-2 bg-white/10 rounded-lg">
								<span className="text-white text-sm">{option}</span>
								<button
									type="button"
									onClick={() => handleRemoveOption(index)}
									className="text-slate-400 hover:text-red-400 transition-colors"
								>
									<X size={16} />
								</button>
							</div>
						))}
					</div>

					{/* Add Option Input */}
					<div className="flex gap-2">
						<input
							type="text"
							value={newOption}
							onChange={(e) => setNewOption(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
							placeholder="Enter option value"
							className="flex-1 px-3 py-2 rounded-lg border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
							style={{ background: 'rgba(255,255,255,0.03)' }}
						/>
						<button
							type="button"
							onClick={handleAddOption}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
						>
							Add
						</button>
					</div>

					{options.length === 0 && (
						<div className="text-xs text-slate-500 italic mt-2">
							Add at least one option value
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default FieldTypeSelector;
