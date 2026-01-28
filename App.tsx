
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Play, Download, Trash2, Palette, Image as ImageIcon, Sparkles, RefreshCw, Layers, ChevronRight, ChevronLeft } from 'lucide-react';
import { generateOneLineArt } from './services/geminiService';
import { EffectType } from './types';
import EffectFilters from './components/EffectFilters';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [pathData, setPathData] = useState<string | null>(null);
  const [variants, setVariants] = useState<{ [key: number]: string }>({});
  const [selectedVariant, setSelectedVariant] = useState<number>(5); // Default to balanced
  const [isProcessing, setIsProcessing] = useState(false);
  const [lineColor, setLineColor] = useState('#1e293b');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [effect, setEffect] = useState<EffectType>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const effectsScrollRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        setImage(data);
        setVariants({});
        processImage(data, selectedVariant);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Could not access camera.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setImage(dataUrl);
        setVariants({});
        processImage(dataUrl, selectedVariant);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };

  const processImage = async (imgData: string, variant: number) => {
    if (variants[variant]) {
      setPathData(variants[variant]);
      setSelectedVariant(variant);
      startDrawingAnimation();
      return;
    }

    setIsProcessing(true);
    setSelectedVariant(variant);
    try {
      const path = await generateOneLineArt(imgData, variant);
      if (path) {
        setPathData(path);
        setVariants(prev => ({ ...prev, [variant]: path }));
        startDrawingAnimation();
      } else {
        alert("Failed to find a continuous path. Try a different complexity level.");
      }
    } catch (error) {
      alert("AI Processing error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startDrawingAnimation = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  // Add togglePlayback function to fix the error in the button onClick handler
  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (progress >= 100) {
        setProgress(0);
      }
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    let animationFrame: number;
    if (isPlaying && progress < 100) {
      const animate = () => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          // Levels 8-10 have much longer paths, so we animate them at a speed that feels satisfying
          const step = selectedVariant > 7 ? 0.8 : 1.5;
          return prev + step;
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, progress, selectedVariant]);

  const getFilter = (eff: EffectType) => {
    if (eff === 'none') return 'none';
    return `url(#${eff}-effect)`;
  };

  const getStroke = (eff: EffectType) => {
    if (eff === 'metal') return 'url(#metal-gradient)';
    return lineColor;
  };

  const downloadPNG = () => {
    if (!svgRef.current || !pathData) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard high-quality aspect ratio (4:3)
    const width = 3200;
    const height = 2400;
    canvas.width = width;
    canvas.height = height;

    // Fill canvas background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Get filters and gradient definitions
    const defs = document.querySelector('svg defs')?.innerHTML || '';
    const strokeColor = getStroke(effect) === 'url(#metal-gradient)' ? '#a1a1aa' : lineColor;
    
    // Construct standalone SVG with embedded definitions
    const styledSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${width}" height="${height}">
        <defs>${defs}</defs>
        <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="${getFilter(effect)}" />
      </svg>
    `;

    const img = new Image();
    const svgBlob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const pngUrl = canvas.toDataURL("image/png", 1.0);
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `LineFlow_Complexity${selectedVariant}_${effect}.png`;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const effectsList: EffectType[] = ['none', 'glow', 'glass', 'metal', 'neon', 'sketch', 'shadow', 'emboss'];

  const scrollEffects = (dir: 'left' | 'right') => {
    if (effectsScrollRef.current) {
      const scrollAmount = 200;
      effectsScrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-indigo-100">
      <EffectFilters />
      {/* Hidden canvas for camera capture to ensure the ref is assigned and the feature works */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Sidebar Control Panel */}
      <aside className="w-full md:w-80 bg-white border-b md:border-r border-slate-200 p-6 flex flex-col gap-8 shrink-0 z-20 overflow-y-auto max-h-screen scrollbar-hide">
        <header className="space-y-1">
          <h1 className="text-3xl font-serif text-slate-900 font-bold tracking-tight">LineFlow AI</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Studio Mode</p>
          </div>
        </header>

        {/* Action: Upload / Camera */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Source Image</label>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={startCamera} 
              className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95 group shadow-lg"
            >
              <Camera className="mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-[11px] font-bold">Live Camera</span>
            </button>
            <label className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-white transition-all group">
              <Upload className="mb-2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={24} />
              <span className="text-[11px] font-bold text-slate-500">Local File</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
        </section>

        {/* Complexity Scale 1-10 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Layers size={14} /> Line Complexity
            </label>
            <span className="text-xs font-bold bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-sm">{selectedVariant}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                disabled={!image || isProcessing}
                onClick={() => image && processImage(image, v)}
                className={`h-10 rounded-xl font-bold transition-all border-2 text-xs flex items-center justify-center ${
                  selectedVariant === v 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                } ${(!image || isProcessing) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-90 hover:scale-105'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-400 px-1">
            <span className="uppercase tracking-widest">Silhouette</span>
            <span className="uppercase tracking-widest">Masterpiece</span>
          </div>
        </section>

        {/* Scrollable Effects Drawer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Sparkles size={14} /> Artistic Finish
            </label>
            <div className="flex gap-1">
              <button onClick={() => scrollEffects('left')} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={16}/></button>
              <button onClick={() => scrollEffects('right')} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div 
            ref={effectsScrollRef}
            className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x"
            style={{ scrollbarWidth: 'none' }}
          >
            {effectsList.map((eff) => (
              <button
                key={eff}
                onClick={() => setEffect(eff)}
                className={`min-w-[90px] h-24 snap-center rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                  effect === eff 
                  ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-50 shadow-md' 
                  : 'bg-slate-50 border-transparent hover:bg-slate-100'
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110"
                  style={{ 
                    background: eff === 'metal' ? 'linear-gradient(135deg, #71717a, #e4e4e7, #71717a)' : lineColor,
                    filter: getFilter(eff)
                  }}
                />
                <span className={`text-[10px] font-bold capitalize ${effect === eff ? 'text-indigo-600' : 'text-slate-500'}`}>{eff}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Appearance: Colors */}
        <section className="space-y-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Palette size={14} /> Canvas & Ink
          </label>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-2">
              <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} className="w-12 h-12 rounded-2xl cursor-pointer border-4 border-white shadow-xl overflow-hidden bg-transparent transition-transform hover:scale-110" title="Ink Color" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ink</span>
            </div>
            <div className="h-12 w-px bg-slate-200" />
            <div className="flex flex-col items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-12 h-12 rounded-2xl cursor-pointer border-4 border-white shadow-xl overflow-hidden bg-transparent transition-transform hover:scale-110" title="Paper Color" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Paper</span>
            </div>
          </div>
        </section>

        {/* Draw Button */}
        <footer className="mt-auto">
          <button
            disabled={!pathData || isProcessing}
            onClick={togglePlayback}
            className={`w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl ${
              !pathData || isProcessing ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 active:scale-95'
            }`}
          >
            {isPlaying ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
            {progress < 100 ? `Tracing... ${Math.round(progress)}%` : "Re-Draw Masterpiece"}
          </button>
        </footer>
      </aside>

      {/* Main Artboard Canvas */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-12 lg:p-16">
        <div 
          className="relative w-full max-w-5xl aspect-[4/3] rounded-[3.5rem] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.18)] overflow-hidden transition-all duration-700 ease-out border-[12px] border-white ring-1 ring-slate-200"
          style={{ backgroundColor: bgColor }}
        >
          {/* Subtle backdrop when processing */}
          {image && isProcessing && (
            <img src={image} className="absolute inset-0 w-full h-full object-contain opacity-[0.03] grayscale contrast-150 animate-pulse" alt="reference" />
          )}

          {/* AI Loader Experience */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/40 backdrop-blur-xl">
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-6 bg-indigo-50 rounded-full animate-pulse flex items-center justify-center">
                  <ImageIcon className="text-indigo-200" size={32} />
                </div>
              </div>
              <h2 className="text-3xl font-serif text-slate-900 font-bold mb-2 italic">Deconstructing Art...</h2>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">Complexity Level {selectedVariant}</p>
            </div>
          )}

          {/* Artistic Path Layer */}
          {pathData && (
            <svg 
              ref={svgRef}
              viewBox="0 0 1000 1000" 
              className="absolute inset-0 w-full h-full p-20 overflow-visible pointer-events-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d={pathData}
                fill="none"
                stroke={getStroke(effect)}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={getFilter(effect)}
                className="drawing-path"
                style={{
                  strokeDasharray: 15000,
                  strokeDashoffset: 15000 - (15000 * (progress / 100)),
                  opacity: progress > 0 ? 1 : 0,
                  transition: 'stroke 0.4s ease, filter 0.4s ease, stroke-width 0.3s ease'
                }}
              />
            </svg>
          )}

          {/* Empty State / Welcome Screen */}
          {!image && !isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 p-12 text-center animate-in fade-in zoom-in duration-1000">
              <div className="w-44 h-44 bg-slate-50 rounded-[3.5rem] flex items-center justify-center mb-10 shadow-inner relative group border-4 border-white transition-transform hover:rotate-3">
                <ImageIcon size={72} className="group-hover:scale-110 transition-transform text-slate-100" />
                <div className="absolute -bottom-6 -right-6 bg-indigo-600 p-5 rounded-3xl shadow-2xl text-white transform group-hover:-translate-y-2 transition-transform">
                  <Sparkles size={32} />
                </div>
              </div>
              <h2 className="text-5xl font-serif text-slate-900 mb-4 font-black tracking-tight leading-tight">Artistic Flow</h2>
              <p className="max-w-md text-slate-400 text-xl leading-relaxed font-medium">Capture a scene and watch AI weave its essence into a single masterpiece line.</p>
              <div className="mt-8 flex gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-100" />
                <div className="w-2 h-2 rounded-full bg-indigo-200" />
                <div className="w-2 h-2 rounded-full bg-indigo-300" />
              </div>
            </div>
          )}
        </div>

        {/* Global Export Controls */}
        {pathData && !isProcessing && progress >= 100 && (
          <div className="mt-14 flex items-center gap-6 animate-in slide-in-from-bottom-12 duration-700 ease-out">
            <button 
              onClick={() => { setImage(null); setPathData(null); setVariants({}); setProgress(100); }}
              className="group flex items-center gap-3 px-10 py-5 bg-white text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:text-red-500 hover:shadow-red-500/10 border border-slate-100 transition-all active:scale-95"
            >
              <Trash2 size={20} className="group-hover:rotate-12 transition-transform" /> Clear Studio
            </button>
            <button 
              onClick={downloadPNG}
              className="flex items-center gap-3 px-14 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] hover:bg-indigo-600 hover:-translate-y-2 hover:shadow-indigo-500/30 transition-all active:translate-y-0"
            >
              <Download size={20} /> Export PNG
            </button>
          </div>
        )}
      </main>

      {/* Fullscreen Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-[4rem] overflow-hidden shadow-2xl ring-1 ring-white/20">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover aspect-video" />
            <div className="absolute bottom-0 inset-x-0 p-12 flex justify-center items-center gap-24 bg-gradient-to-t from-black via-black/40 to-transparent">
              <button 
                onClick={stopCamera}
                className="w-20 h-20 flex items-center justify-center bg-white/5 text-white rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all backdrop-blur-md"
              >
                <Trash2 size={36} />
              </button>
              <button 
                onClick={capturePhoto}
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-[12px] border-white/20 active:scale-90 transition-all hover:scale-105"
              >
                <div className="w-24 h-24 rounded-full border-[8px] border-slate-900" />
              </button>
              <div className="w-20" /> 
            </div>
          </div>
          <p className="text-white/20 mt-12 text-2xl font-black tracking-[0.4em] uppercase">Capture Frame</p>
        </div>
      )}
    </div>
  );
};

export default App;
