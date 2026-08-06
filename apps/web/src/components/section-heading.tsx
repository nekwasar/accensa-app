import React from 'react';

/**
 * A section heading in the house style: an uppercase emerald eyebrow, then a
 * heavy title whose final word drops to a lighter serif italic.
 *
 * The device was previously applied by hand at each call site, which is how
 * `SDK Drop-in` ended up as the only section heading without it and a size step
 * behind its peers. Passing `tail` here means the treatment is the default and
 * omitting it has to be deliberate.
 */
export function SectionHeading({
 eyebrow,
 children,
 tail,
 className = '',
}: {
 eyebrow?: string;
 children: React.ReactNode;
 /** Final word, set in the lighter serif italic. */
 tail?: string;
 className?: string;
}) {
 return (
 <div className={className}>
 {eyebrow && (
 <p className="uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">
 {eyebrow}
 </p>
 )}
 <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">
 {children}
 {tail && (
 <>
 {' '}
 <span className="text-slate-400 dark:text-slate-500 italic font-normal">{tail}</span>
 </>
 )}
 </h2>
 </div>
 );
}
