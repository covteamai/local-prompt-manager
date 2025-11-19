import React, { useRef, useState } from 'react';
import { Database, Upload, Plus, FileJson, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { dbService } from '../services/DatabaseService';

interface LoaderProps {
  onLoaded: () => void;
}

export const Loader: React.FC<LoaderProps> = ({ onLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNew = async () => {
    setLoading(true);
    try {
      await dbService.init();
      onLoaded();
    } catch (e) {
      setError("Failed to initialize database engine. Please check your connection.");
      setLoading(false);
    }
  };

  const loadFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const u8 = new Uint8Array(reader.result as ArrayBuffer);
        await dbService.init(u8);
        onLoaded();
      } catch (e) {
        setError("Invalid SQLite file provided.");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">Local Prompt Manager</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Secure, offline, hierarchical prompt management using local SQLite.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 space-y-6 transition-colors">
          
          <div className="space-y-4">
             <Button 
              onClick={handleNew} 
              className="w-full justify-center" 
              size="lg"
              disabled={loading}
              icon={<Plus className="w-5 h-5" />}
            >
              {loading ? 'Initializing...' : 'Create New Database'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">Or load existing</span>
              </div>
            </div>

            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".sqlite,.db,.sqlite3"
                onChange={handleFileUpload}
              />
              <Upload className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-200">
                Click to upload or drag and drop
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                .sqlite, .db files
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}
        </div>
        
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Data stays in your browser. No server uploads.
        </p>
      </div>
    </div>
  );
};