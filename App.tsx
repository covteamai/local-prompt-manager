
import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  Sun,
  AlertTriangle,
  ArrowLeft,
  HardDrive,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Loader } from './components/Loader';
import { Button } from './components/Button';
import { JsonEditor } from './components/JsonEditor';
import { dbService } from './services/DatabaseService';
import { Project, Bot, Prompt } from './types';

// --- Context ---

interface AppContextType {
  refresh: number;
  triggerRefresh: () => void;
}

const AppContext = React.createContext<AppContextType>({
  refresh: 0,
  triggerRefresh: () => {},
});

const useApp = () => useContext(AppContext);

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

const DeleteResourceModal: React.FC<{
  isOpen: boolean;
  resourceType: 'Project' | 'Bot' | 'Prompt';
  resourceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, resourceType, resourceName, onConfirm, onCancel }) => {
  const [input, setInput] = useState('');
  
  useEffect(() => {
    if (isOpen) setInput('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-start mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete {resourceType}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              This action cannot be undone. This will permanently delete the {resourceType.toLowerCase()} <strong>{resourceName}</strong>
              {resourceType === 'Project' ? ' and all associated bots and prompts' : ''}
              {resourceType === 'Bot' ? ' and all associated prompts' : ''}.
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Please type <span className="font-mono font-bold select-all">{resourceName}</span> to confirm.
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors"
            placeholder={resourceName}
            autoFocus
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            variant="danger"
            disabled={input !== resourceName}
            onClick={onConfirm}
          >
            Delete {resourceType}
          </Button>
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

const Layout: React.FC<{ children: React.ReactNode, onSaveDb: () => void, isSaving: boolean, saveStatus: string }> = ({ children, onSaveDb, isSaving, saveStatus }) => {
  const { refresh, triggerRefresh } = useApp();
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

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    dbService.createProject(newProjectName, '');
    setNewProjectName('');
    setNewProjectModal(false);
    triggerRefresh();
  };

  const hasHandle = dbService.hasFileHandle();
  const fileName = dbService.getFileName();

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

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          
          {/* File Info Status */}
          {hasHandle && (
            <div className="mb-2 flex items-center text-xs text-slate-500 dark:text-slate-400 truncate" title={`Saving to: ${fileName}`}>
               <HardDrive className="w-3 h-3 mr-1.5" />
               <span className="truncate">{fileName}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={onSaveDb} 
              variant={hasHandle ? "primary" : "outline"}
              size="sm" 
              className="flex-1 justify-center"
              icon={isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : (hasHandle ? <Save className="w-4 h-4" /> : <Download className="w-4 h-4" />)}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : (hasHandle ? 'Save' : 'Download DB')}
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
          {saveStatus && (
             <div className="mt-1 text-xs text-center text-green-600 dark:text-green-400 animate-fade-in">
               {saveStatus}
             </div>
          )}
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
             {hasHandle && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">Persistent</span>}
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
  const { refresh } = useApp();
  const projects = useProjects(refresh);
  
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
  const { refresh, triggerRefresh } = useApp();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [newBotName, setNewBotName] = useState('');
  const [showNewBot, setShowNewBot] = useState(false);
  
  // Deletion State
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);

  // Fetch Project Details
  useEffect(() => {
    const p = dbService.getProject(id);
    setProject(p);
  }, [id, refresh]);

  const bots = useBots(id, refresh);

  const handleCreateBot = () => {
    if(!newBotName.trim()) return;
    dbService.createBot(id, newBotName, '');
    setNewBotName('');
    setShowNewBot(false);
    triggerRefresh();
  };

  const handleDeleteBotRequest = (bot: Bot) => {
    setBotToDelete(bot);
  };

  const confirmDeleteBot = () => {
    if (botToDelete) {
      dbService.deleteBot(botToDelete.id);
      triggerRefresh();
      setBotToDelete(null);
    }
  };

  const handleDeleteProject = () => {
    dbService.deleteProject(id);
    triggerRefresh();
    navigate('/');
  };

  if (!project) {
     return (
       <div className="text-center pt-20">
         <div className="inline-block p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500 dark:text-red-400 mb-4">
           <AlertTriangle className="w-8 h-8" />
         </div>
         <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Not Found</h2>
         <p className="text-slate-500 dark:text-slate-400 mt-2">This project may have been deleted.</p>
         <Link to="/" className="inline-block mt-4 text-blue-600 hover:underline">Return to Dashboard</Link>
       </div>
     );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
          <Folder className="w-6 h-6 mr-3 text-slate-400" />
          {project.name}
        </h1>
        <div className="flex gap-3">
           <Button 
             variant="danger" 
             size="sm" 
             onClick={() => setDeleteProjectModalOpen(true)}
             icon={<Trash2 className="w-4 h-4"/>}
           >
             Delete Project
           </Button>
           <Button icon={<Plus className="w-4 h-4"/>} onClick={() => setShowNewBot(true)}>New Bot</Button>
        </div>
      </div>

      {showNewBot && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex items-center gap-4">
           <input 
              type="text" 
              placeholder="Bot Name" 
              className="flex-1 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newBotName}
              onChange={e => setNewBotName(e.target.value)}
              autoFocus
            />
            <Button onClick={handleCreateBot}>Save</Button>
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
               <button onClick={(e) => { e.preventDefault(); handleDeleteBotRequest(bot); }} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400">
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

      {/* Delete Project Modal */}
      <DeleteResourceModal 
        isOpen={deleteProjectModalOpen}
        resourceType="Project"
        resourceName={project.name}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteProjectModalOpen(false)}
      />

      {/* Delete Bot Modal */}
      <DeleteResourceModal 
        isOpen={!!botToDelete}
        resourceType="Bot"
        resourceName={botToDelete?.name || ''}
        onConfirm={confirmDeleteBot}
        onCancel={() => setBotToDelete(null)}
      />
    </div>
  );
};

const BotDetail = () => {
  const { projectId, botId } = useParams();
  const pId = parseInt(projectId || '0');
  const bId = parseInt(botId || '0');
  const { triggerRefresh, refresh } = useApp();
  const prompts = usePrompts(bId, refresh);
  const navigate = useNavigate();

  // Deletion State
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);

  const handleCreate = () => {
    const id = dbService.createPrompt(bId, "New Prompt");
    triggerRefresh();
    navigate(`/project/${pId}/bot/${bId}/prompt/${id}`);
  };

  const handleDeleteRequest = (prompt: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPromptToDelete(prompt);
  };

  const confirmDeletePrompt = () => {
    if (promptToDelete) {
      dbService.deletePrompt(promptToDelete.id);
      triggerRefresh();
      setPromptToDelete(null);
    }
  };

  const handleDuplicate = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dbService.duplicatePrompt(id);
    triggerRefresh();
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
                <button onClick={(e) => handleDuplicate(prompt.id, e)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={(e) => handleDeleteRequest(prompt, e)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Delete Prompt Modal */}
      <DeleteResourceModal 
        isOpen={!!promptToDelete}
        resourceType="Prompt"
        resourceName={promptToDelete?.name || ''}
        onConfirm={confirmDeletePrompt}
        onCancel={() => setPromptToDelete(null)}
      />
    </div>
  );
};

const PromptEditor = () => {
  const { projectId, botId, promptId } = useParams();
  const id = parseInt(promptId || '0');
  const navigate = useNavigate();
  const { triggerRefresh } = useApp();
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [dirty, setDirty] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [devPrompt, setDevPrompt] = useState(''); // Mapped to user_prompt in DB
  const [notes, setNotes] = useState('');         // Mapped to dev_prompt in DB
  const [params, setParams] = useState('');

  useEffect(() => {
    const p = dbService.getPrompt(id);
    if (p) {
      setPrompt(p);
      setName(p.name);
      setSystemPrompt(p.system_prompt || '');
      setDevPrompt(p.user_prompt || ''); // Renamed from User Prompt
      setNotes(p.dev_prompt || '');      // Renamed from Developer Prompt/Notes
      setParams(p.params || '{}');
    }
  }, [id]);

  const handleSave = () => {
    if (!prompt) return;
    dbService.updatePrompt(id, {
      name,
      system_prompt: systemPrompt,
      user_prompt: devPrompt, 
      dev_prompt: notes, 
      params
    });
    setDirty(false);
    triggerRefresh();
  };

  const handleDelete = () => {
    if (!prompt) return;
    dbService.deletePrompt(id);
    triggerRefresh();
    navigate(`/project/${projectId}/bot/${botId}`);
  };

  const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    setter(val);
    setDirty(true);
  };

  if (!prompt) return <div className="p-4 text-slate-500">Loading prompt...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center flex-1 mr-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <input 
              type="text" 
              value={name} 
              onChange={(e) => handleChange(setName, e.target.value)}
              className="text-xl font-bold text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 w-full p-0"
              placeholder="Prompt Name"
            />
             <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2">
               <span>ID: {prompt.id}</span>
             </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button 
             variant="danger" 
             size="sm" 
             onClick={() => setDeleteModalOpen(true)}
             icon={<Trash2 className="w-4 h-4"/>}
           >
             Delete
           </Button>
           <Button 
             onClick={handleSave} 
             disabled={!dirty}
             variant={dirty ? 'primary' : 'secondary'}
             icon={<Save className="w-4 h-4"/>}
           >
             {dirty ? 'Save Changes' : 'Saved'}
           </Button>
        </div>
      </div>

      {/* Editor Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">
        
        {/* Left Column */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
              <Settings className="w-4 h-4 mr-1.5" /> System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => handleChange(setSystemPrompt, e.target.value)}
              className="flex-1 w-full p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
              placeholder="You are a helpful assistant..."
              style={{ minHeight: '200px' }}
            />
          </div>
          
           <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-1.5" /> Developer Prompt
            </label>
            <textarea
              value={devPrompt}
              onChange={(e) => handleChange(setDevPrompt, e.target.value)}
              className="flex-1 w-full p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 resize-none font-mono"
              placeholder="Enter main user prompt/canvas here..."
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
              <Settings className="w-4 h-4 mr-1.5" /> Parameters (JSON)
            </label>
            <div className="flex-1 border border-slate-300 dark:border-slate-600 rounded-md overflow-hidden bg-white dark:bg-slate-800" style={{ minHeight: '200px' }}>
              <JsonEditor 
                value={params} 
                onChange={(val) => handleChange(setParams, val)} 
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-1.5" /> Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleChange(setNotes, e.target.value)}
              className="flex-1 w-full p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
              placeholder="Internal developer notes..."
              style={{ minHeight: '200px' }}
            />
          </div>
        </div>

      </div>

      {/* Delete Prompt Modal */}
      <DeleteResourceModal 
        isOpen={deleteModalOpen}
        resourceType="Prompt"
        resourceName={name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

// --- Main App ---

const Main = () => {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const triggerRefresh = useCallback(() => {
    setRefresh(prev => prev + 1);
  }, []);

  const handleSaveDb = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      // 1. Try saving to File Handle if exists
      const success = await dbService.saveToDisk();
      
      if (success) {
        setSaveStatus('Saved to disk!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        // 2. Fallback to Download
        const data = dbService.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompts_${new Date().toISOString().slice(0, 10)}.sqlite`;
        a.click();
        window.URL.revokeObjectURL(url);
        setSaveStatus('Downloaded');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (e) {
      console.error("Failed to save DB", e);
      alert("Failed to save database: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!dbLoaded) {
    return <Loader onLoaded={() => setDbLoaded(true)} />;
  }

  return (
    <AppContext.Provider value={{ refresh, triggerRefresh }}>
      <HashRouter>
        <Layout onSaveDb={handleSaveDb} isSaving={isSaving} saveStatus={saveStatus}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:projectId" element={<ProjectDetail />} />
            <Route path="/project/:projectId/bot/:botId" element={<BotDetail />} />
            <Route path="/project/:projectId/bot/:botId/prompt/:promptId" element={<PromptEditor />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default Main;
