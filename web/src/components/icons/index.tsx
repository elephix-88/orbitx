interface IconProps {
 className?: string;
}

export const WorkflowIcon = ({ className = "w-5 h-5" }: IconProps) => (
 <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
 />
 </svg>
);

export const ConnectionIcon = ({ className = "w-5 h-5" }: IconProps) => (
 <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
 />
 </svg>
);

export const HomeIcon = ({ className = "w-5 h-5" }: IconProps) => (
 <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
 />
 </svg>
);
