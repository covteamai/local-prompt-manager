import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { 
  Folder, 
  Bot as BotIcon, 
  FileText, 
  Download, 
  Plus, 
  Settings, 
  Trash2, 
  Save, 
  ChevronRight, 
  Copy,
  Home, 
  Menu,
  X,
  ExternalLink,
  Moon,
  Sun
} from 'lucide-react';
import { Loader } from './components/Loader';
import { Button } from './components/Button';
import { JsonEditor } from './components/JsonEditor';
import { dbService } from './services/DatabaseService';
import { Project, Bot, Prompt } from './types';

// --- Hooks ---

const useProjects = (refreshTrigger: number) => {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    setProjects(dbService.getProjects());
  }, [refreshTrigger]);
  return projects;
};

const useBots = (projectId: number | undefined, refreshTrigger: number) => {
  const [bots, setBots] = useState<Bot[]>([]);
  useEffect(() => {
    if (projectId) setBots(dbService.getBots(projectId));
  }, [projectId, refreshTrigger]);
  return bots;
};

const usePrompts = (botId: number | undefined, refreshTrigger: number) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  useEffect(() => {
    if (botId) setPrompts(dbService.getPrompts(botId));
  }, [botId, refreshTrigger]);
  return prompts;
};

// --- Components ---

const ConfirmModal: React.FC<{ 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ to: string, icon: React.ReactNode, label: string, isActive?: boolean }> = ({ to, icon, label, isActive }) => (
  <Link 
    to={to} 
    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors ${
      isActive 
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`}
  >
    <span className="mr-3 h-4 w-4">{icon}</span>
    <span className="truncate">{label}</span>
  </Link>
);

// --- Layout ---

const Layout: React.FC<{ children: React.ReactNode, onSaveDb: () => void }> = ({ children, onSaveDb }) => {
  const [refresh, setRefresh] = useState(0);
  const projects = useProjects(refresh);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Theme State
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

  const triggerRefresh = () => setRefresh(prev => prev + 1);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    dbService.createProject(newProjectName, '');
    setNewProjectName('');
    setNewProjectModal(false);
    triggerRefresh();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center font-bold text-slate-800 dark:text-slate-100">
            <BotIcon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            <span className="whitespace-nowrap">Prompt Mgr</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
             <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          <div className="mb-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</span>
              <button onClick={() => setNewProjectModal(true)} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <SidebarItem to="/" icon={<Home className="w-4 h-4"/>} label="Dashboard" isActive={location.pathname === '/'} />

            {projects.map(p => (
              <SidebarItem 
                key={p.id} 
                to={`/project/${p.id}`} 
                icon={<Folder className="w-4 h-4"/>} 
                label={p.name} 
                isActive={location.pathname.startsWith(`/project/${p.id}`)}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2">
          <Button 
            onClick={onSaveDb} 
            variant="outline" 
            size="sm" 
            className="flex-1 justify-center"
            icon={<Download className="w-4 h-4" />}
          >
            Save DB
          </Button>
           <Button 
            onClick={() => setDarkMode(!darkMode)} 
            variant="ghost" 
            size="sm" 
            className="px-2"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 shadow-sm z-10 transition-colors">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="mr-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 font-medium text-slate-800 dark:text-slate-100 truncate flex items-center">
             <span className="text-slate-400 dark:text-slate-500 mr-2">Local Workspace</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Create Project Modal */}
      {newProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">New Project</h3>
            <input 
              type="text" 
              placeholder="Project Name" 
              className="w-full border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNewProjectModal(false)}>Cancel</Button>
              <Button onClick={handleCreateProject}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Pages ---

const Dashboard = () => {
  const projects = useProjects(0);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Projects</h3>
            <Folder className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{projects.length}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Active projects</p>
        </div>
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { projectId } = useParams();
  const id = parseInt(projectId || '0');
  const [trigger, setTrigger] = useState(0);
  const bots = useBots(id, trigger);
  const [newBotName, setNewBotName] = useState('');
  const [showNewBot, setShowNewBot] = useState(false);

  const handleCreate = () => {
    if(!newBotName.trim()) return;
    dbService.createBot(id, newBotName, '');
    setNewBotName('');
    setShowNewBot(false);
    setTrigger(t => t + 1);
  };

  const handleDelete = (botId: number) => {
    if(confirm('Are you sure?')) {
      dbService.deleteBot(botId);
      setTrigger(t => t + 1);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <Folder className="w-6 h-6 mr-2 text-slate-400" />
          Project Bots
        </h1>
        <Button icon={<Plus className="w-4 h-4"/>} onClick={() => setShowNewBot(true)}>New Bot</Button>
      </div>

      {showNewBot && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex items-center gap-4">
           <input 
              type="text" 
              placeholder="Bot Name" 
              className="flex-1 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newBotName}
              onChange={e => setNewBotName(e.target.value)}
            />
            <Button onClick={handleCreate}>Save</Button>
            <Button variant="ghost" onClick={() => setShowNewBot(false)}>Cancel</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots.length === 0 && !showNewBot && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
            <BotIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No bots yet. Create one to get started.</p>
          </div>
        )}
        {bots.map(bot => (
          <div key={bot.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors group relative">
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={(e) => { e.preventDefault(); handleDelete(bot.id); }} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
             <Link to={`/project/${id}/bot/${bot.id}`} className="block">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
                  <BotIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{bot.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{bot.description || 'No description'}</p>
                </div>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                <span>Updated {new Date(bot.updated_at).toLocaleDateString()}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
             </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

const BotDetail = () => {
  const { projectId, botId } = useParams();
  const pId = parseInt(projectId || '0');
  const bId = parseInt(botId || '0');
  const [trigger, setTrigger] = useState(0);
  const prompts = usePrompts(bId, trigger);
  const navigate = useNavigate();

  const handleCreate = () => {
    const id = dbService.createPrompt(bId, "New Prompt");
    navigate(`/project/${pId}/bot/${bId}/prompt/${id}`);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm("Delete this prompt?")) {
      dbService.deletePrompt(id);
      setTrigger(t => t + 1);
    }
  };

  const handleDuplicate = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dbService.duplicatePrompt(id);
    setTrigger(t => t + 1);
  };

  return (
    <div>
       <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to={`/project/${pId}`} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mr-2">
             Project
          </Link>
          <span className="text-slate-300 dark:text-slate-600 mr-2">/</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Prompts</h1>
        </div>
        <Button icon={<Plus className="w-4 h-4"/>} onClick={handleCreate}>New Prompt</Button>
      </div>

      <div className="space-y-3">
        {prompts.length === 0 && (
           <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No prompts yet.</p>
          </div>
        )}
        {prompts.map(prompt => (
          <Link 
            key={prompt.id} 
            to={`/project/${pId}/bot/${bId}/prompt/${prompt.id}`}
            className="block bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3" />
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{prompt.name}</span>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex gap-2">
                     <span>ID: {prompt.id}</span>
                     <span>•</span>
                     <span>{new Date(prompt.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={(e) => handleDuplicate(prompt.id, e)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  <Copy className="w-4 h-4" />
                </button>
                 <button onClick={(e) => handleDelete(prompt.id, e)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const PromptEditor = () => {
  const { projectId, botId, promptId } = useParams();
  const pId = parseInt(projectId || '0');
  const bId = parseInt(botId || '0');
  const prId = parseInt(promptId || '0');
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = dbService.getPrompt(prId);
    setPrompt(p);
    setLoading(false);
  }, [prId]);

  const handleChange = (field: keyof Prompt, value: string) => {
    if (!prompt) return;
    setPrompt({ ...prompt, [field]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!prompt) return;
    dbService.updatePrompt(prId, prompt);
    setHasChanges(false);
  };

  const handleExport = () => {
    if(!prompt) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompt, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${prompt.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCopy = () => {
    if(!prompt) return;
    const fullText = `${prompt.system_prompt}\n\n${prompt.user_prompt}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hotkey for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt]);

  if (loading) return <div>Loading...</div>;
  if (!prompt) return <div>Prompt not found</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Link to={`/project/${pId}/bot/${bId}`} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Link>
          <input 
            type="text" 
            value={prompt.name} 
            onChange={(e) => handleChange('name', e.target.value)}
            className="font-bold text-xl text-slate-900 dark:text-white bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 rounded px-2 py-1 -ml-2 outline-none transition-colors"
          />
          {hasChanges && <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">Unsaved Changes</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} icon={<ExternalLink className="w-4 h-4" />}>Export</Button>
          <Button variant="outline" size="sm" onClick={handleCopy} icon={<Copy className="w-4 h-4" />}>{copied ? 'Copied!' : 'Copy'}</Button>
          <Button onClick={handleSave} disabled={!hasChanges} icon={<Save className="w-4 h-4" />}>Save</Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column: System & User Prompt */}
        <div className="col-span-8 flex flex-col gap-4 h-full overflow-y-auto pr-2 scrollbar-thin">
          
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center">
              System Prompt
            </div>
            <textarea 
              className="w-full p-4 min-h-[150px] resize-y outline-none font-mono text-sm text-slate-800 dark:text-slate-200 bg-transparent placeholder-slate-400 dark:placeholder-slate-600"
              placeholder="You are a helpful assistant..."
              value={prompt.system_prompt}
              onChange={(e) => handleChange('system_prompt', e.target.value)}
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col min-h-[300px] transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300">
              Developer Prompt
            </div>
            <textarea 
              className="w-full p-4 flex-1 resize-none outline-none font-mono text-sm text-slate-800 dark:text-slate-200 bg-transparent leading-relaxed placeholder-slate-400 dark:placeholder-slate-600"
              placeholder="Enter your main prompt here..."
              value={prompt.user_prompt}
              onChange={(e) => handleChange('user_prompt', e.target.value)}
            />
          </div>

        </div>

        {/* Right Column: Params & Dev Notes */}
        <div className="col-span-4 flex flex-col gap-4 h-full overflow-y-auto pl-1 scrollbar-thin">
          
           <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-1/2 transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300 flex justify-between">
              <span>Parameters</span>
              <span className="text-xs text-slate-400 font-mono">JSON</span>
            </div>
            <div className="flex-1 relative">
              <JsonEditor 
                value={prompt.params} 
                onChange={(v) => handleChange('params', v)} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-1/2 transition-colors">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300">
              Notes
            </div>
            <textarea 
              className="w-full p-4 flex-1 resize-none outline-none text-sm text-slate-600 dark:text-slate-300 bg-transparent placeholder-slate-400 dark:placeholder-slate-600"
              placeholder="Notes about logic, chain of thought requirements, etc..."
              value={prompt.dev_prompt}
              onChange={(e) => handleChange('dev_prompt', e.target.value)}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Main App Wrapper ---

const App = () => {
  const [dbLoaded, setDbLoaded] = useState(false);

  const handleSaveDb = () => {
    try {
      const data = dbService.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts_backup_${new Date().toISOString().slice(0,10)}.sqlite`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to save database.");
    }
  };

  if (!dbLoaded) {
    return <Loader onLoaded={() => setDbLoaded(true)} />;
  }

  return (
    <HashRouter>
      <Layout onSaveDb={handleSaveDb}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<ProjectDetail />} />
          <Route path="/project/:projectId/bot/:botId" element={<BotDetail />} />
          <Route path="/project/:projectId/bot/:botId/prompt/:promptId" element={<PromptEditor />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;