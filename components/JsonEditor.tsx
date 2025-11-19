import React, { useState, useEffect } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (val: string) => void;
  onValidChange?: (val: string) => void;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, onValidChange }) => {
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    try {
      JSON.parse(value);
      setIsValid(true);
      onValidChange?.(value);
    } catch (e) {
      setIsValid(false);
    }
  }, [value, onValidChange]);

  return (
    <div className="relative h-full flex flex-col">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full flex-1 p-3 font-mono text-sm border rounded-md resize-none focus:ring-2 focus:outline-none bg-transparent dark:text-slate-200 transition-colors ${
          isValid 
            ? 'border-slate-300 focus:ring-blue-500 dark:border-slate-600 dark:focus:ring-blue-400' 
            : 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/10 dark:border-red-500'
        }`}
        spellCheck={false}
      />
      {!isValid && (
        <div className="absolute bottom-2 right-2 text-xs text-red-600 dark:text-red-300 bg-white/90 dark:bg-slate-800/90 px-2 py-1 rounded border border-red-200 dark:border-red-800 shadow-sm">
          Invalid JSON
        </div>
      )}
    </div>
  );
};