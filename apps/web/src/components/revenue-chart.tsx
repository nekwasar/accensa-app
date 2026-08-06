import React from 'react';
import { formatAmount, assetLabel } from '@/lib/money';
import type { RevenueSeries } from '@/lib/revenue-analytics';

/**
 * Revenue over time, as stacked bars.
 *
 * Inline SVG rather than a charting library: the repo takes no new runtime
 * dependency for this, and a stacked bar chart with a fixed bucket count is a
 * few lines of arithmetic the aggregation layer has already done.
 *
 * Every bar is split into two segments, and the split is the point of the
 * chart. The lower segment is revenue whose route the merchant's own server
 * reported; the upper segment is revenue the ledger recorded but nothing
 * explains. Drawing one total bar would imply the whole figure is attributed,
 * which is the specific claim this product is not allowed to make loosely.
 */

const VIEW_W = 1000;
const VIEW_H = 260;
const PAD_BOTTOM = 28;
const PAD_TOP = 8;
const PLOT_H = VIEW_H - PAD_BOTTOM - PAD_TOP;

export function RevenueChart({ series }: { series: RevenueSeries }) {
 const { buckets } = series;
 if (buckets.length === 0) {
 return (
 <p className="text-sm text-slate-500 dark:text-slate-400 py-12 text-center">
 No settled payments in this range.
 </p>
 );
 }

 const slot = VIEW_W / buckets.length;
 // Leave a gap between bars, but never let a dense range collapse them to
 // slivers thinner than a hairline.
 const barW = Math.max(1, Math.min(slot * 0.62, 56));
 const asset = assetLabel(series.asset);

 // Label every bar when there is room, otherwise thin them out so the axis
 // stays readable instead of turning into a smear.
 const labelEvery = Math.ceil(buckets.length / 12);

 return (
 <figure className="w-full">
 <figcaption className="sr-only">
 Revenue per {series.granularity === 'week' ? 'week' : 'day'} in {asset}, split into
 attributed and unattributed.
 </figcaption>

 <div className="overflow-x-auto">
 <svg
 viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
 className="w-full min-w-[520px] h-[260px]"
 role="img"
 aria-label={`Revenue per ${series.granularity}. Total ${series.total} ${asset}, of which ${series.attributedTotal} is attributed to a route.`}
 >
 {/* Baseline */}
 <line
 x1={0}
 y1={PAD_TOP + PLOT_H}
 x2={VIEW_W}
 y2={PAD_TOP + PLOT_H}
 className="stroke-slate-200 dark:stroke-white/10"
 strokeWidth={1}
 />

 {buckets.map((bucket, i) => {
 const totalH = bucket.totalFraction * PLOT_H;
 const attributedH = bucket.attributedFraction * PLOT_H;
 const unattributedH = Math.max(0, totalH - attributedH);
 const x = i * slot + (slot - barW) / 2;
 const top = PAD_TOP + PLOT_H - totalH;

 return (
 <g key={bucket.start}>
 <title>
 {`${bucket.label}: ${bucket.total} ${asset} total — ${bucket.attributed} attributed across ${bucket.attributedCalls} call${bucket.attributedCalls === 1 ? '' : 's'}, ${bucket.unattributed} unattributed across ${bucket.unattributedCalls}`}
 </title>

 {/* Unattributed sits on top, hatched, so it reads as "not explained"
 rather than as another category of earnings. */}
 {unattributedH > 0 && (
 <rect
 x={x}
 y={top}
 width={barW}
 height={unattributedH}
 fill="url(#unattributed-hatch)"
 className="stroke-slate-300 dark:stroke-white/20"
 strokeWidth={1}
 />
 )}
 {attributedH > 0 && (
 <rect
 x={x}
 y={PAD_TOP + PLOT_H - attributedH}
 width={barW}
 height={attributedH}
 className="fill-emerald-500/80 dark:fill-emerald-400/70"
 />
 )}

 {i % labelEvery === 0 && (
 <text
 x={i * slot + slot / 2}
 y={VIEW_H - 8}
 textAnchor="middle"
 className="fill-slate-400 dark:fill-slate-500 text-[11px]"
 >
 {bucket.label}
 </text>
 )}
 </g>
 );
 })}

 <defs>
 <pattern
 id="unattributed-hatch"
 width={6}
 height={6}
 patternUnits="userSpaceOnUse"
 patternTransform="rotate(45)"
 >
 <line
 x1={0}
 y1={0}
 x2={0}
 y2={6}
 className="stroke-slate-400/60 dark:stroke-slate-500/60"
 strokeWidth={2}
 />
 </pattern>
 </defs>
 </svg>
 </div>

 <div className="flex flex-wrap items-center gap-6 mt-4 text-xs">
 <Legend swatch="attributed" label={`Attributed — ${formatAmount(series.attributedTotal)} ${asset}`} />
 <Legend swatch="unattributed" label={`Unattributed — ${formatAmount(series.unattributedTotal)} ${asset}`} />
 </div>
 </figure>
 );
}

function Legend({ swatch, label }: { swatch: 'attributed' | 'unattributed'; label: string }) {
 return (
 <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
 <span
 aria-hidden
 className={
 swatch === 'attributed'
 ? 'w-3 h-3 bg-emerald-500/80 dark:bg-emerald-400/70'
 : 'w-3 h-3 border border-slate-300 dark:border-white/20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(100,116,139,0.6)_2px,rgba(100,116,139,0.6)_4px)]'
 }
 />
 {label}
 </span>
 );
}
