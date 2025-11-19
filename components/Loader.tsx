
import React, { useRef, useState, useEffect } from 'react';
import { Database, Upload, Plus, AlertCircle, Sun, Moon, HardDrive, FolderOpen, FilePlus } from 'lucide-react';
import { Button } from './Button';
import { dbService } from '../services/DatabaseService';
import { StorageService } from '../services/StorageService';

interface LoaderProps {
  onLoaded: () => void;
}

export const Loader: React.FC<LoaderProps> = ({ onLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedHandle, setSavedHandle] = useState<FileSystemFileHandle | undefined>(undefined);

  // Theme State Logic
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Check for saved handle on mount
  useEffect(() => {
    StorageService.getHandle().then(handle => {
      if (handle) {
        setSavedHandle(handle);
      }
    });
  }, []);

  const handleNew = async () => {
    setLoading(true);
    try {
      await dbService.init();
      dbService.setFileHandle(null);
      await StorageService.clearHandle();
      onLoaded();
    } catch (e) {
      setError("Failed to initialize database engine.");
      setLoading(false);
    }
  };

  // --- File System Access API Methods ---

  const handleCreateAtLocation = async () => {
    setLoading(true);
    try {
      // @ts-ignore - window.showSaveFilePicker is not in standard types yet
      const handle = await window.showSaveFilePicker({
        suggestedName: 'prompts.sqlite',
        types: [{
          description: 'SQLite Database',
          accept: { 'application/x-sqlite3': ['.sqlite', '.db', '.sqlite3'] },
        }],
      });

      // Init new DB in memory
      await dbService.init();
      dbService.setFileHandle(handle);
      
      // Write empty DB to file immediately
      await dbService.saveToDisk();
      
      // Save handle for next time
      await StorageService.saveHandle(handle);
      
      onLoaded();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError("Failed to create file: " + e.message);
      }
      setLoading(false);
    }
  };

  const handleOpenLocation = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'SQLite Database',
          accept: { 'application/x-sqlite3': ['.sqlite', '.db', '.sqlite3'] },
        }],
        multiple: false
      });

      const file = await handle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);
      
      await dbService.init(u8);
      dbService.setFileHandle(handle);
      await StorageService.saveHandle(handle);
      
      onLoaded();
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError("Failed to open file: " + e.message);
      }
      setLoading(false);
    }
  };

  const handleLoadSaved = async () => {
    if (!savedHandle) return;
    setLoading(true);
    try {
      // Request permission if needed
      // @ts-ignore
      const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        // @ts-ignore
        const request = await savedHandle.requestPermission({ mode: 'readwrite' });
        if (request !== 'granted') {
          throw new Error("Permission denied");
        }
      }

      const file = await savedHandle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);
      
      await dbService.init(u8);
      dbService.setFileHandle(savedHandle);
      
      onLoaded();
    } catch (e: any) {
      setError("Failed to load saved file. It may have been moved or deleted. " + e.message);
      // Optionally clear invalid handle
      if (e.message.includes('found') || e.message.includes('denied')) {
         setSavedHandle(undefined);
         StorageService.clearHandle();
      }
      setLoading(false);
    }
  };

  // --- Standard Input Fallback ---

  const loadFile = (file: File) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const u8 = new Uint8Array(reader.result as ArrayBuffer);
        await dbService.init(u8);
        dbService.setFileHandle(null); // No handle for drag-dropped files
        await StorageService.clearHandle();
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

  // Check if File System Access API is supported
  const isFSAASupported = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors relative">
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <Button 
          onClick={() => setDarkMode(!darkMode)} 
          variant="ghost" 
          size="sm" 
          className="rounded-full p-2"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Header / Info Column */}
        <div className="flex flex-col justify-center text-center md:text-left space-y-6">
          <div className="mx-auto md:mx-0 h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
             <h2 className="text-4xl font-bold text-slate-900 dark:text-white">Local Prompt Manager</h2>
             <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
               A secure, offline workspace for your AI prompts. 
               Organize projects and bots locally using SQLite.
             </p>
          </div>
          
          <div className="bg-white/50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
             <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
               <HardDrive className="w-4 h-4 mr-2" /> 
               Persistent Storage
             </h3>
             <p className="text-sm text-slate-600 dark:text-slate-400">
               This app works best when you select a local file. 
               Changes will be saved directly to your disk, making Git sync and backups easy.
             </p>
          </div>
        </div>

        {/* Actions Column */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 space-y-8 border border-slate-100 dark:border-slate-800">
          
          {/* Persistent File Section */}
          {isFSAASupported && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Persistent Workspace</h3>
              
              {savedHandle ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800/50">
                  <label className="block text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Detected Last Session</label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center truncate mr-2">
                       <Database className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{savedHandle.name}</span>
                    </div>
                    <Button size="sm" onClick={handleLoadSaved} disabled={loading}>Load</Button>
                  </div>
                </div>
              ) : (
                 <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={handleOpenLocation} 
                      disabled={loading} 
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-dashed"
                    >
                      <FolderOpen className="w-6 h-6 mb-1 text-blue-500" />
                      <span>Open File</span>
                    </Button>
                    <Button 
                      onClick={handleCreateAtLocation} 
                      disabled={loading} 
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 border-dashed"
                    >
                      <FilePlus className="w-6 h-6 mb-1 text-green-500" />
                      <span>Create New File</span>
                    </Button>
                 </div>
              )}
              
              {/* Path "Fake" Field */}
              <div className="relative">
                 <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Active Database Location</label>
                 <div className="flex">
                   <input 
                     type="text" 
                     readOnly
                     value={savedHandle ? savedHandle.name : "No persistent file selected"}
                     className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-l-md px-3 py-2 text-sm text-slate-600 dark:text-slate-400 cursor-not-allowed"
                   />
                   <Button 
                     variant="secondary" 
                     className="rounded-l-none border-l-0 border border-slate-300 dark:border-slate-700"
                     onClick={handleOpenLocation}
                     disabled={loading}
                   >
                     Change
                   </Button>
                 </div>
              </div>
            </div>
          )}

          <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white dark:bg-slate-900 text-slate-400">Legacy Options</span>
              </div>
          </div>

          {/* Temporary/Memory Options */}
          <div className="space-y-3">
            <Button 
              onClick={handleNew} 
              className="w-full justify-center" 
              variant="secondary"
              disabled={loading}
              icon={<Plus className="w-4 h-4" />}
            >
              Start Temporary Session (In-Memory)
            </Button>

            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'}`}
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
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Upload file (Memory only)</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
