import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { generateImage } from '../services/geminiService';
import { updateUserCredits, saveImage } from '../services/mockBackend';
import { STORAGE_KEYS, IMAGE_COST } from '../constants';
import { User } from '../types';
import { Download, AlertTriangle, Key } from 'lucide-react';

export const Generator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  useEffect(() => {
    const uStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (uStr) {
      setUser(JSON.parse(uStr));
    }
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if ((window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setNeedsApiKey(!hasKey);
    }
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setNeedsApiKey(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Check API Key first
    if (needsApiKey) {
        await handleSelectKey();
        return; 
    }

    if (user.credits < IMAGE_COST) {
      setError(`Not enough credits. You need ${IMAGE_COST} credits to generate an image.`);
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedImage(null);

    try {
      const result = await generateImage(prompt, size);
      setGeneratedImage(result.imageUrl);
      
      // Deduct credits
      const updatedUser = updateUserCredits(user.id, IMAGE_COST, 'subtract');
      setUser(updatedUser); 
      
      window.dispatchEvent(new Event('user-updated'));
      saveImage(user.id, prompt, result.imageUrl, 'gemini-3-pro-image-preview', size);

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Requested entity was not found")) {
          setError("API Key invalid or expired. Please select a valid key.");
          setNeedsApiKey(true);
      } else {
          setError('Failed to generate image. Please try again later.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Image Generator</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create stunning visuals with Gemini Nano Banana Pro (gemini-3-pro-image-preview).
            Cost: {IMAGE_COST} Credits per image.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <textarea
                  className="w-full h-32 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:outline-none resize-none"
                  placeholder="Describe your imagination... e.g., 'A cyberpunk street food vendor in Tokyo, neon lights, 4k, realistic'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Resolution</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['1K', '2K', '4K'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`py-2 px-4 rounded-lg border font-medium transition-all ${
                        size === s 
                          ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900' 
                          : 'bg-transparent text-gray-500 border-gray-200 hover:border-gray-400 dark:border-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                  <div className="flex items-center space-x-2 text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg text-sm">
                      <AlertTriangle size={16} />
                      <span>{error}</span>
                  </div>
              )}

              {needsApiKey ? (
                  <Button 
                    type="button" 
                    onClick={handleSelectKey}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    size="lg"
                  >
                    <Key className="mr-2 h-5 w-5" />
                    Connect Google API Key
                  </Button>
              ) : (
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg" 
                    isLoading={isGenerating}
                    disabled={user?.credits! < IMAGE_COST}
                  >
                    Generate Image (-{IMAGE_COST} Credits)
                  </Button>
              )}
              
              <div className="text-xs text-gray-400 text-center">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                  Billing information
                </a>
              </div>
            </form>
          </div>

          {/* Preview */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center min-h-[400px] border border-gray-200 dark:border-gray-700 overflow-hidden relative">
            {isGenerating ? (
              <div className="text-center space-y-4 animate-pulse">
                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto"></div>
                <p className="text-gray-500 font-medium">Dreaming up your image...</p>
                <p className="text-xs text-gray-400">Using Gemini 3 Pro Image Preview</p>
              </div>
            ) : generatedImage ? (
              <div className="relative group w-full h-full">
                <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a 
                    href={generatedImage} 
                    download={`dipak-digital-${Date.now()}.png`}
                    className="flex items-center space-x-2 bg-white text-gray-900 px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition"
                  >
                    <Download size={20} />
                    <span>Download {size}</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center p-6 space-y-2">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-4">
                    <Download className="text-gray-400" size={24}/>
                </div>
                <p>Your creation will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};