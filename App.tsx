
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Upload, Play, Download, Trash2, Palette, 
  Image as ImageIcon, Sparkles, RefreshCw, Layers, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Sliders, Activity, Eye
} from 'lucide-react';
import { generateOneLineArt } from './services/geminiService';
import { EffectType } from './types';
import EffectFilters from './components/EffectFilters';

const App: React.FC = () => {
  // --- State ---
  const [image, setImage] = useState<string | null>(null);
  const [pathData, setPathData] = useState<string | null>(null);
  const [variants, setVariants] = useState<{ [key: number]: string }>({});
  const [selectedVariant, setSelectedVariant] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lineColor, setLineColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [effect, setEffect] = useState<EffectType>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [showCamera, setShowCamera] = useState(false);
  
  // UI State: Collapsible Sections
  const [expandedSection, setExpandedSection] = useState<string | null>('source');

  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const effectsScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        resetStudio();
        setImage(data);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
      alert("Camera access denied.");
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
        resetStudio();
        setImage(dataUrl);
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

  const resetStudio = () => {
    setImage(null);
    setPathData(null);
    setVariants({});
    setProgress(0);
    setIsPlaying(false);
    setIsProcessing(false);
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
        // Start drawing immediately after synthesis
        setProgress(0);
        setIsPlaying(true);
      } else {
        alert("Path generation failed. Try a different complexity.");
      }
    } catch (error) {
      alert("AI Processing error. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startDrawingAnimation = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const handleStartAction = () => {
    if (!image) return;
    
    if (pathData) {
      // If we already have path data (maybe just finished or re-drawing), just start animation
      startDrawingAnimation();
    } else {
      // First time: need AI synthesis
      processImage(image, selectedVariant);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      handleStartAction();
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
          const step = selectedVariant >= 9 ? 0.4 : selectedVariant >= 5 ? 0.8 : 1.5;
          return Math.min(prev + step, 100);
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, progress, selectedVariant]);

  const getFilter = (eff: EffectType) => eff === 'none' ? 'none' : `url(#${eff}-effect)`;
  const getStroke = (eff: EffectType) => eff === 'metal' ? 'url(#metal-gradient)' : lineColor;

  const downloadPNG = () => {
    if (!svgRef.current || !pathData) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = 3200;
    const height = 2400;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    const defs = document.querySelector('svg defs')?.innerHTML || '';
    const strokeColor = getStroke(effect) === 'url(#metal-gradient)' ? '#a1a1aa' : lineColor;
    const styledSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${width}" height="${height}"><defs>${defs}</defs><path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="${getFilter(effect)}" /></svg>`;
    const img = new Image();
    const svgBlob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png", 1.0);
      downloadLink.download = `LineFlow_Masterpiece.png`;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const effectsList: EffectType[] = ['none', 'glow', 'glass', 'metal', 'neon', 'sketch', 'shadow', 'emboss'];

  const toggleSection = (section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row text-slate-900 selection:bg-indigo-100 overflow-hidden">
      <EffectFilters />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Studio Sidebar */}
      <aside className="w-full md:w-80 bg-white border-b md:border-r border-neutral-200 flex flex-col shrink-0 z-20 shadow-sm relative overflow-y-auto scrollbar-hide">
        <header className="p-6 border-b border-neutral-100">
          <h1 className="text-3xl font-serif text-neutral-900 font-bold tracking-tight italic">LineFlow</h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1">Design Studio Pro</p>
        </header>

        <div className="flex-1">
          {/* Section: Source */}
          <div className="border-b border-neutral-50">
            <button 
              onClick={() => toggleSection('source')}
              className="w-full px-6 py-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-indigo-600 transition-colors"
            >
              <span className="flex items-center gap-3"><ImageIcon size={14} /> 01 Input Source</span>
              {expandedSection === 'source' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'source' ? 'max-h-60 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={startCamera} className="flex flex-col items-center justify-center p-4 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-all active:scale-95">
                  <Camera className="mb-2" size={20} />
                  <span className="text-[10px] font-bold">Live Cam</span>
                </button>
                <label className="flex flex-col items-center justify-center p-4 bg-neutral-50 border border-neutral-200 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-white transition-all group">
                  <Upload className="mb-2 text-neutral-400 group-hover:text-indigo-600 transition-colors" size={20} />
                  <span className="text-[10px] font-bold text-neutral-500">File</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>

          {/* Section: Line Settings */}
          <div className="border-b border-neutral-50">
            <button 
              onClick={() => toggleSection('line')}
              className="w-full px-6 py-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-indigo-600 transition-colors"
            >
              <span className="flex items-center gap-3"><Sliders size={14} /> 02 Line Settings</span>
              {expandedSection === 'line' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'line' ? 'max-h-[500px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                    <span>COMPLEXITY</span>
                    <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-900">{selectedVariant}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                      <button
                        key={v}
                        disabled={!image || isProcessing}
                        onClick={() => {
                          if (image) {
                            setSelectedVariant(v);
                            // If we have an image but click a new complexity, we reset the path data to force re-synthesis
                            setPathData(null);
                            setProgress(0);
                            setIsPlaying(false);
                          }
                        }}
                        className={`h-8 rounded-lg font-bold transition-all border text-[10px] flex items-center justify-center ${
                          selectedVariant === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-neutral-200 text-neutral-400 hover:border-indigo-200'
                        } ${(!image || isProcessing) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-90'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                    <span>STROKE WEIGHT</span>
                    <span>{strokeWidth}px</span>
                  </div>
                  <input 
                    type="range" min="1" max="25" step="1" 
                    value={strokeWidth} 
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Ink Color</span>
                    <div className="flex items-center gap-3">
                      <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-sm overflow-hidden bg-transparent" />
                      <span className="text-[9px] font-mono text-neutral-500">{lineColor.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Canvas</span>
                    <div className="flex items-center gap-3">
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-sm overflow-hidden bg-transparent" />
                      <span className="text-[9px] font-mono text-neutral-500">{bgColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Finish */}
          <div className="border-b border-neutral-50">
            <button 
              onClick={() => toggleSection('finish')}
              className="w-full px-6 py-4 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-indigo-600 transition-colors"
            >
              <span className="flex items-center gap-3"><Sparkles size={14} /> 03 Artistic Finish</span>
              {expandedSection === 'finish' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === 'finish' ? 'max-h-80 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-3 gap-2">
                {effectsList.map((eff) => (
                  <button
                    key={eff}
                    onClick={() => setEffect(eff)}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                      effect === eff ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-neutral-100 hover:border-neutral-300'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border border-white"
                      style={{ background: eff === 'metal' ? 'linear-gradient(135deg, #71717a, #e4e4e7, #71717a)' : lineColor, filter: getFilter(eff) }}
                    />
                    <span className="text-[9px] font-bold capitalize text-neutral-600 truncate w-full text-center">{eff}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <footer className="p-6 bg-neutral-50 mt-auto">
          <button
            disabled={!image || isProcessing}
            onClick={togglePlayback}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
              !image || isProcessing 
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg active:scale-95'
            }`}
          >
            {isPlaying || isProcessing ? (
               <RefreshCw className="animate-spin" size={16} />
            ) : (
               <Play size={16} fill="currentColor" />
            )}
            {isProcessing ? "Synthesizing..." : isPlaying ? `Tracing... ${Math.round(progress)}%` : "Start Drawing"}
          </button>
        </footer>
      </aside>

      {/* Main Artboard */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-8 md:p-12">
        <div 
          className="relative w-full max-w-4xl aspect-[4/3] rounded-[2.5rem] shadow-2xl overflow-hidden border-[10px] border-white ring-1 ring-neutral-200 transition-all duration-500"
          style={{ backgroundColor: bgColor }}
        >
          {/* Thumbnail / High-Res Preview */}
          {image && !pathData && !isProcessing && (
            <div className="absolute inset-0 p-8 flex items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden shadow-inner border border-neutral-100 bg-neutral-50">
                <img src={image} className="w-full h-full object-contain" alt="thumbnail preview" />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 shadow-xl border border-neutral-100">
                  <Eye className="text-indigo-600" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Preview Loaded</span>
                </div>
              </div>
            </div>
          )}

          {/* Reference substrate (very light during drawing) */}
          {image && (isProcessing || (pathData && progress < 100)) && (
            <img src={image} className="absolute inset-0 w-full h-full object-contain opacity-[0.03] grayscale contrast-150 transition-opacity duration-1000" alt="ref" />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/70 backdrop-blur-md">
              <Activity className="animate-pulse text-indigo-600 mb-4" size={40} />
              <h2 className="text-2xl font-serif text-neutral-900 font-bold italic">Analyzing Form...</h2>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-1">Generating Masterpiece Path</p>
            </div>
          )}

          {/* SVG Artwork */}
          {pathData && (
            <svg ref={svgRef} viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full p-12 overflow-visible pointer-events-none" preserveAspectRatio="xMidYMid meet">
              <path
                d={pathData}
                fill="none"
                stroke={getStroke(effect)}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={getFilter(effect)}
                style={{
                  strokeDasharray: 35000,
                  strokeDashoffset: 35000 - (35000 * (progress / 100)),
                  opacity: pathData ? 1 : 0,
                  transition: isPlaying ? 'none' : 'stroke-dashoffset 0.6s ease-out, stroke 0.4s ease, filter 0.4s ease'
                }}
              />
            </svg>
          )}

          {/* Empty state */}
          {!image && !isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 p-12 text-center animate-in fade-in zoom-in duration-1000">
              <div className="w-32 h-32 bg-neutral-50 rounded-full flex items-center justify-center mb-8 border border-neutral-100 shadow-inner group transition-transform hover:scale-105">
                <ImageIcon size={48} className="text-neutral-200" />
              </div>
              <h2 className="text-4xl font-serif text-neutral-900 mb-3 font-black italic">Design Studio</h2>
              <p className="max-w-xs text-neutral-400 text-sm font-medium">Capture or upload an image to begin your single-line transformation.</p>
            </div>
          )}
          
          {/* Path ready indicator */}
          {pathData && !isPlaying && progress === 0 && !isProcessing && (
            <div className="absolute top-8 right-8 flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full shadow-sm animate-bounce">
              <Play className="text-indigo-600" size={14} fill="currentColor" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Ready to Draw</span>
            </div>
          )}
        </div>

        {/* Global Controls */}
        {image && !isProcessing && progress >= 100 && (
          <div className="mt-10 flex items-center gap-4 animate-in slide-in-from-bottom-6 duration-500">
            <button 
              onClick={resetStudio} 
              className="flex items-center gap-2 px-6 py-3 bg-white text-neutral-400 rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:text-red-500 border border-neutral-100 transition-all active:scale-95"
            >
              <Trash2 size={16} /> Clear Session
            </button>
            {pathData && (
              <button 
                onClick={downloadPNG} 
                className="flex items-center gap-3 px-10 py-4 bg-neutral-900 text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:-translate-y-1 active:translate-y-0 transition-all"
              >
                <Download size={18} /> Export Masterpiece
              </button>
            )}
          </div>
        )}
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-neutral-900/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-xl">
          <div className="relative w-full max-w-3xl bg-black rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/10">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover aspect-video" />
            <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center items-center gap-12 bg-gradient-to-t from-black to-transparent">
              <button onClick={stopCamera} className="w-14 h-14 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-red-500/30 transition-all">
                <Trash2 size={24} />
              </button>
              <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-[8px] border-white/20 active:scale-90 transition-all hover:scale-105">
                <div className="w-16 h-16 rounded-full border-[4px] border-neutral-900" />
              </button>
              <div className="w-14" /> 
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
