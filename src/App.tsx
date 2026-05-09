import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { PDF_TOOLS, PDFTool } from './constants';
import { cn } from './lib/utils';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees } from 'pdf-lib';

import { GoogleGenAI } from "@google/genai";

// --- Components ---

const ChatWithPDF = ({ file, initialPrompt }: { file: File, initialPrompt?: string }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, []);

  const handleSend = async (customMsg?: string) => {
    const msgToSend = customMsg || input;
    if (!msgToSend.trim() || loading) return;

    if (!customMsg) setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msgToSend }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: await fileToBase64(file),
              mimeType: "application/pdf"
            }
          },
          { text: msgToSend }
        ],
        config: {
          systemInstruction: "You are a helpful PDF assistant. Analyze the provided PDF and answer the user's questions accurately."
        }
      });

      const response = await model;
      setMessages(prev => [...prev, { role: 'ai', text: response.text || "I couldn't analyze that PDF." }]);
    } catch (error) {
      console.error('Gemini Error:', error);
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="flex h-[600px] flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center gap-3 border-b border-gray-100 p-4">
        <Icons.MessageSquare className="h-5 w-5 text-orange-500" />
        <h3 className="font-bold text-gray-900">Chat with {file.name}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            <Icons.Bot className="mb-4 h-12 w-12 opacity-20" />
            <p>Ask me anything about this PDF!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex w-full",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
              msg.role === 'user' ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-500">
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 focus:border-orange-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="rounded-xl bg-orange-500 p-2 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <Icons.Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ 
  onHomeClick, 
  onToolSelect,
  onCategorySelect 
}: { 
  onHomeClick: () => void;
  onToolSelect: (toolId: string) => void;
  onCategorySelect: (categoryId: string) => void;
}) => (
  <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <div 
        className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
        onClick={onHomeClick}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-200">
          <Icons.Candy className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">PDF Candy</span>
      </div>
      <div className="hidden md:block">
        <div className="flex items-center gap-8">
          <button onClick={onHomeClick} className="text-sm font-medium text-gray-600 hover:text-orange-500">All Tools</button>
          <button onClick={() => onToolSelect('compress-pdf')} className="text-sm font-medium text-gray-600 hover:text-orange-500">Compress</button>
          <button onClick={() => onCategorySelect('to-pdf')} className="text-sm font-medium text-gray-600 hover:text-orange-500">Convert</button>
          <button onClick={() => onToolSelect('merge-pdf')} className="text-sm font-medium text-gray-600 hover:text-orange-500">Merge</button>
          <button className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-95">
            Sign In
          </button>
        </div>
      </div>
    </div>
  </nav>
);

const ToolCard = ({ tool, onClick }: { tool: PDFTool; onClick: () => void }) => {
  const IconComponent = (Icons as any)[tool.icon] || Icons.File;
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5"
    >
      <div className={cn(
        "mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors group-hover:bg-orange-50",
        "bg-gray-50 text-gray-600 group-hover:text-orange-500"
      )}>
        <IconComponent className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-orange-600">{tool.name}</h3>
      <p className="text-sm leading-relaxed text-gray-500">{tool.description}</p>
    </motion.div>
  );
};

const UploadZone = ({ onFilesAdded, toolName }: { onFilesAdded: (files: File[]) => void, toolName: string }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => onFilesAdded(acceptedFiles),
    accept: { 'application/pdf': ['.pdf'] }
  } as any);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex min-h-[400px] w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all",
        isDragActive ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-white"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center text-center px-6">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl shadow-gray-200">
          <Icons.Upload className="h-10 w-10 text-orange-500" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Upload files for {toolName}</h2>
        <p className="mb-8 text-gray-500">Drag and drop your PDF files here, or click to select files</p>
        <button className="flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-600 hover:shadow-orange-300 active:scale-95">
          <Icons.Plus className="h-6 w-6" />
          Add Files
        </button>
      </div>
    </div>
  );
};

const ToolView = ({ tool, onBack }: { tool: PDFTool; onBack: () => void }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const [isChatting, setIsChatting] = useState(false);

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  };

  const processFiles = async () => {
    if (tool.id === 'chat-with-pdf') {
      setIsChatting(true);
      return;
    }
    setIsProcessing(true);
    try {
      if (tool.id === 'merge-pdf') {
        const mergedPdf = await PDFDocument.create();
        for (const file of files) {
          const bytes = await file.arrayBuffer();
          const pdf = await PDFDocument.load(bytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
      } else if (tool.id === 'rotate-pdf') {
        const file = files[0];
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const pages = pdf.getPages();
        pages.forEach(page => {
          const rotation = page.getRotation().angle;
          page.setRotation(degrees(rotation + 90));
        });
        const pdfBytes = await pdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
      } else if (tool.id === 'delete-pages') {
        const file = files[0];
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        // For simplicity, just delete the last page in this demo
        if (pdf.getPageCount() > 1) {
          pdf.removePage(pdf.getPageCount() - 1);
        }
        const pdfBytes = await pdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
      } else if (tool.id === 'split-pdf') {
        const file = files[0];
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const splitPdf = await PDFDocument.create();
        const [firstPage] = await splitPdf.copyPages(pdf, [0]);
        splitPdf.addPage(firstPage);
        const pdfBytes = await splitPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
      } else if (tool.id === 'edit-metadata') {
        const file = files[0];
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        pdf.setTitle('Processed by PDF Candy');
        pdf.setAuthor('PDF Candy Clone');
        pdf.setSubject('PDF Metadata Edit');
        const pdfBytes = await pdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
      } else if (tool.id === 'txt-to-pdf') {
        const file = files[0];
        const text = await file.text();
        const pdf = await PDFDocument.create();
        const page = pdf.addPage();
        page.drawText(text, { x: 50, y: 700, size: 12 });
        const pdfBytes = await pdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        setResultUrl(URL.createObjectURL(blob));
      } else if (tool.id === 'pdf-summarizer' || tool.id === 'pdf-translator') {
        setIsChatting(true);
        return;
      } else {
        // Mock processing for other tools for now
        await new Promise(resolve => setTimeout(resolve, 2000));
        setResultUrl(URL.createObjectURL(files[0]));
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (isChatting) {
      setIsChatting(false);
      setFiles([]);
    } else {
      onBack();
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <button
        onClick={handleBack}
        className="mb-8 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-500"
      >
        <Icons.ArrowLeft className="h-4 w-4" />
        {isChatting ? 'Back to upload' : 'Back to all tools'}
      </button>

      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-black tracking-tight text-gray-900">{tool.name}</h1>
        <p className="text-lg text-gray-500">{tool.description}</p>
      </div>

      {!resultUrl && !isChatting ? (
        <div className="space-y-8">
          <UploadZone onFilesAdded={handleFilesAdded} toolName={tool.name} />
          
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <h3 className="mb-4 font-bold text-gray-900">Selected Files ({files.length})</h3>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <Icons.FileText className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Icons.X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                disabled={isProcessing}
                onClick={processFiles}
                className="mt-6 w-full rounded-xl bg-gray-900 py-4 text-lg font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : tool.id === 'chat-with-pdf' ? 'Start Chatting' : `Run ${tool.name}`}
              </button>
            </motion.div>
          )}
        </div>
      ) : isChatting ? (
        <ChatWithPDF 
          file={files[0]} 
          initialPrompt={
            tool.id === 'pdf-summarizer' ? 'Please provide a concise summary of this PDF.' :
            tool.id === 'pdf-translator' ? 'Please translate the content of this PDF to Spanish (or specify your language).' :
            undefined
          } 
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center rounded-3xl border border-orange-100 bg-orange-50 p-12 text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl shadow-orange-200">
            <Icons.CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Task Completed!</h2>
          <p className="mb-8 text-gray-600">Your file is ready for download.</p>
          <div className="flex gap-4">
            <a
              href={resultUrl}
              download={`processed-${tool.id}.pdf`}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-600"
            >
              <Icons.Download className="h-6 w-6" />
              Download File
            </a>
            <button
              onClick={() => {
                setResultUrl(null);
                setFiles([]);
              }}
              className="rounded-full bg-white px-8 py-4 text-lg font-bold text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50"
            >
              Start Over
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [selectedTool, setSelectedTool] = useState<PDFTool | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleHomeClick = () => {
    setSelectedTool(null);
    setActiveCategory('all');
    setSearchQuery('');
  };

  const handleToolSelect = (toolId: string) => {
    const tool = PDF_TOOLS.find(t => t.id === toolId);
    if (tool) setSelectedTool(tool);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedTool(null);
    setActiveCategory(categoryId);
    setSearchQuery('');
  };

  const categories = [
    { id: 'all', name: 'All Tools', icon: 'LayoutGrid' },
    { id: 'core', name: 'Core', icon: 'Star' },
    { id: 'management', name: 'Management', icon: 'FileEdit' },
    { id: 'to-pdf', name: 'To PDF', icon: 'ArrowRightCircle' },
    { id: 'from-pdf', name: 'From PDF', icon: 'ArrowLeftCircle' },
    { id: 'ai', name: 'AI Tools', icon: 'Sparkles' },
  ];

  const filteredTools = PDF_TOOLS.filter(t => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Navbar 
        onHomeClick={handleHomeClick}
        onToolSelect={handleToolSelect}
        onCategorySelect={handleCategorySelect}
      />
      
      <main>
        <AnimatePresence mode="wait">
          {!selectedTool ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
            >
              <div className="mb-16 text-center">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-6 text-5xl font-black tracking-tight sm:text-7xl"
                >
                  PDF tools for <span className="text-orange-500">everyone.</span>
                </motion.h1>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mx-auto max-w-2xl text-xl text-gray-500"
                >
                  The easiest way to edit, convert, and manage your PDF files online. 
                  Free, fast, and secure.
                </motion.p>
              </div>

              {/* Search and Category Filter */}
              <div className="mb-12 flex flex-col items-center gap-8">
                <div className="relative w-full max-w-xl">
                  <Icons.Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for a tool (e.g. 'merge', 'word', 'ai')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-12 pr-4 text-lg transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {categories.map((cat) => {
                    const Icon = (Icons as any)[cat.icon] || Icons.Circle;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all",
                          activeCategory === cat.id 
                            ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <ToolCard tool={tool} onClick={() => setSelectedTool(tool)} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tool"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ToolView tool={selectedTool} onBack={() => setSelectedTool(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-2">
              <Icons.Candy className="h-6 w-6 text-orange-500" />
              <span className="text-lg font-bold">PDF Candy</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-gray-500">
              <a href="#" className="hover:text-orange-500">Privacy Policy</a>
              <a href="#" className="hover:text-orange-500">Terms of Service</a>
              <a href="#" className="hover:text-orange-500">Contact Us</a>
            </div>
            <p className="text-sm text-gray-400">© 2026 PDF Candy Clone. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
