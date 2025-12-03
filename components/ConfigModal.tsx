import React, { useState, useEffect } from 'react';
import { X, Key, Info } from 'lucide-react';
import { AppConfig } from '../types';
import { Button } from './Button';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState<AppConfig>(config);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            API Configuration
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3 text-sm text-blue-200">
            <Info className="w-5 h-5 shrink-0 text-blue-400" />
            <div>
              <p className="font-semibold mb-1">How to get these credentials:</p>
              <ol className="list-decimal list-inside space-y-1 opacity-80">
                <li>Go to <a href="https://labs.google" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">labs.google</a> and log in.</li>
                <li>Open Developer Tools (F12) → Network Tab.</li>
                <li>Perform an action (e.g., generate an image).</li>
                <li>Find a request to <code>generateImage</code> or <code>runImageRecipe</code>.</li>
                <li>Copy the <code>Authorization</code> header (Bearer token) and <code>workflowId</code> from payload.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Bearer Token (Authorization Header)</label>
              <input 
                type="password" 
                value={formData.bearerToken}
                onChange={e => setFormData(prev => ({...prev, bearerToken: e.target.value}))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                placeholder="eyJh..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Session Token (Cookie: __Secure-next-auth.session-token)</label>
              <input 
                type="password" 
                value={formData.sessionToken}
                onChange={e => setFormData(prev => ({...prev, sessionToken: e.target.value}))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                placeholder="eyJhbGci..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Workflow ID</label>
              <input 
                type="text" 
                value={formData.workflowId}
                onChange={e => setFormData(prev => ({...prev, workflowId: e.target.value}))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                placeholder="UUID..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>Save Configuration</Button>
        </div>
      </div>
    </div>
  );
};