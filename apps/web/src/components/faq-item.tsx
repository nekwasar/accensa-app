import React from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

export function FaqItem({ question, answer, isOpen, onClick }: FaqItemProps) {
  return (
    <div className="rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]">
      <button
        onClick={onClick}
        className="w-full px-8 py-6 flex items-center justify-between text-left focus:outline-none group"
      >
        <h3 className="text-lg md:text-xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">
          {question}
        </h3>
        <ChevronDown 
          className={`w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 flex-shrink-0 ml-4 group-hover:scale-110 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-8 pb-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed transition-colors duration-300">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
