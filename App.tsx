import React, { useState, useEffect } from 'react';
import { Settings, Play, Image as ImageIcon, Trash2, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { GlassCard } from './components/GlassCard';
import { Button } from './components/Button';
import { ConfigModal } from './components/ConfigModal';
import { AppConfig, AspectRatio, GenerationJob, JobStatus } from './types';
import { generateImageTextOnly, generateImageWithRecipe, uploadReferenceImage } from './services/whiskService';

const DEFAULT_CONFIG: AppConfig = {
  bearerToken: '',
  sessionToken: '',
  workflowId: ''
};

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('whisk_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [prompts, setPrompts] = useState('');
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  // Stats
  const successCount = jobs.filter(j => j.status === JobStatus.SUCCESS).length;
  const failedCount = jobs.filter(j => j.status === JobStatus.FAILED).length;
  const totalCount = jobs.length;

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('whisk_config', JSON.stringify(newConfig));
    setIsConfigOpen(false);
  };

  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReferencePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferencePreview(null);
  };

  const processQueue = async (jobsToProcess: GenerationJob[]) => {
    setIsGenerating(true);
    let uploadedMediaId: string | null = null;

    // 1. Upload Reference Image if it exists and hasn't been uploaded for this batch
    if (referenceImage) {
      try {
        // We update all pending jobs to say "Uploading subject..."
        setJobs(prev => prev.map(j => 
          jobsToProcess.find(p => p.id === j.id) ? { ...j, status: JobStatus.PROCESSING, error: "Uploading subject..." } : j
        ));
        uploadedMediaId = await uploadReferenceImage(referenceImage, config);
      } catch (error) {
        console.error("Failed to upload reference image", error);
        setJobs(prev => prev.map(j => 
          jobsToProcess.find(p => p.id === j.id) ? { ...j, status: JobStatus.FAILED, error: "Subject upload failed" } : j
        ));
        setIsGenerating(false);
        return;
      }
    }

    // 2. Process each job
    for (const job of jobsToProcess) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: JobStatus.PROCESSING, error: undefined } : j));

      try {
        let base64Image: string;
        if (uploadedMediaId) {
          base64Image = await generateImageWithRecipe(job.prompt, uploadedMediaId, aspectRatio, config);
        } else {
          base64Image = await generateImageTextOnly(job.prompt, aspectRatio, config);
        }

        // Add correct header for display if missing
        const finalImage = base64Image.startsWith('data:image') 
          ? base64Image 
          : `data:image/jpeg;base64,${base64Image}`;

        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: JobStatus.SUCCESS, imageUrl: finalImage } : j
        ));
      } catch (error: any) {
        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, status: JobStatus.FAILED, error: error.message || "Unknown error" } : j
        ));
      }
    }
    setIsGenerating(false);
  };

  const handleGenerate = () => {
    if (!config.bearerToken) {
      setIsConfigOpen(true);
      return;
    }

    const lines = prompts.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    const newJobs: GenerationJob[] = lines.map(line => ({
      id: Math.random().toString(36).substr(2, 9),
      prompt: line.trim(),
      status: JobStatus.PENDING,
      timestamp: Date.now()
    }));

    setJobs(prev => [...newJobs, ...prev]); // Add new jobs to top
    processQueue(newJobs);
    setPrompts(''); // Clear input
  };

  const handleRetryFailed = () => {
    const failedJobs = jobs.filter(j => j.status === JobStatus.FAILED);
    if (failedJobs.length === 0) return;
    
    // Reset status
    setJobs(prev => prev.map(j => 
      j.status === JobStatus.FAILED ? { ...j, status: JobStatus.PENDING, error: undefined } : j
    ));
    
    processQueue(failedJobs);
  };

  const downloadImage = (job: GenerationJob) => {
    if (!job.imageUrl) return;
    const link = document.createElement('a');
    link.href = job.imageUrl;
    link.download = `${job.id}_${job.prompt.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearJobs = () => setJobs([]);

  return (
    <div className="min-h-screen pb-20">
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        config={config}
        onSave={handleSaveConfig}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <ImageIcon className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              WhiskGen <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Auto</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-4 text-sm text-gray-400 mr-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {successCount} Success</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {failedCount} Failed</span>
             </div>
            <Button variant="secondary" onClick={() => setIsConfigOpen(true)} icon={<Settings className="w-4 h-4" />}>
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 space-y-8">
        
        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
             <GlassCard title="Reference Subject">
               <div className="space-y-4">
                  <div className={`
                    relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all
                    ${referencePreview ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                  `}>
                    {referencePreview ? (
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden group">
                        <img src={referencePreview} alt="Reference" className="w-full h-full object-cover" />
                        <button 
                          onClick={removeReferenceImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-gray-500 mb-3" />
                        <p className="text-sm text-gray-400">Drop reference image or click to upload</p>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleReferenceImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                       {Object.values(AspectRatio).map((ratio) => (
                         <button
                           key={ratio}
                           onClick={() => setAspectRatio(ratio)}
                           className={`
                             px-2 py-2 rounded-lg text-xs font-medium border transition-all
                             ${aspectRatio === ratio 
                               ? 'bg-blue-600 border-blue-500 text-white' 
                               : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
                           `}
                         >
                           {ratio.split('_').pop()}
                         </button>
                       ))}
                    </div>
                  </div>
               </div>
             </GlassCard>
             
             {/* Note about CORS */}
             <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>Ensure you are running this in a browser instance with CORS disabled or use a proxy extension, as Google Labs headers are restricted.</p>
             </div>
          </div>

          {/* Prompts */}
          <GlassCard className="lg:col-span-2" title="Bulk Prompts" actions={
            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              Generate All
            </Button>
          }>
            <div className="relative">
              <textarea
                value={prompts}
                onChange={(e) => setPrompts(e.target.value)}
                placeholder="Enter prompts (one per line)...&#10;A futuristic city made of crystal&#10;A cat wearing a spacesuit&#10;Cyberpunk street food vendor"
                className="w-full h-64 bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none font-mono text-sm leading-relaxed"
              />
              <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                {prompts.split('\n').filter(l => l.trim()).length} prompts
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Gallery */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Generation Gallery ({totalCount})</h2>
            <div className="flex gap-2">
              {failedCount > 0 && (
                <Button variant="danger" onClick={handleRetryFailed} icon={<RefreshCw className="w-4 h-4" />}>
                  Retry Failed ({failedCount})
                </Button>
              )}
              {totalCount > 0 && (
                <Button variant="ghost" onClick={clearJobs} icon={<Trash2 className="w-4 h-4" />}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
              <ImageIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No generated images yet. Start a batch above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {jobs.map((job) => (
                <div key={job.id} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg transition-transform hover:-translate-y-1">
                  
                  {/* Status Overlay */}
                  <div className="aspect-square relative bg-black/50 flex items-center justify-center">
                    {job.status === JobStatus.SUCCESS && job.imageUrl && (
                      <img src={job.imageUrl} alt={job.prompt} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    
                    {job.status === JobStatus.PENDING && (
                      <div className="text-gray-400 text-sm">Queued...</div>
                    )}
                    
                    {job.status === JobStatus.PROCESSING && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-blue-400 font-medium">{job.error || "Generating..."}</span>
                      </div>
                    )}

                    {job.status === JobStatus.FAILED && (
                      <div className="text-center p-4">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-xs text-red-400">{job.error || "Generation Failed"}</p>
                      </div>
                    )}
                    
                    {/* Hover Actions */}
                    {job.status === JobStatus.SUCCESS && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                         <button 
                           onClick={() => downloadImage(job)}
                           className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                           title="Download"
                         >
                           <Download className="w-5 h-5" />
                         </button>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-1 font-mono uppercase">#{job.id}</p>
                    <p className="text-sm text-gray-200 line-clamp-2" title={job.prompt}>{job.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;