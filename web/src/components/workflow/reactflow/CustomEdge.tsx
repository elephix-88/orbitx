import React from 'react';
import {
 BaseEdge,
 EdgeProps,
 getBezierPath,
} from '@xyflow/react';

// Resolve CSS variable-based design token to a usable color string
const resolveTokenColor = (varName: string): string => {
 if (typeof window === 'undefined') return '#3F3F46';
 const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
 if (!raw) return '#3F3F46';
 return `rgb(${raw})`;
};

const CustomEdge: React.FC<EdgeProps> = ({
 id,
 sourceX,
 sourceY,
 targetX,
 targetY,
 sourcePosition,
 targetPosition,
 selected,
 markerEnd,
 style,
}) => {
 const [edgePath] = getBezierPath({
 sourceX,
 sourceY,
 sourcePosition,
 targetX,
 targetY,
 targetPosition,
 });

 // Use design tokens for edge colors — primary-400 (yellow) when selected, neutral-600 otherwise
 const strokeColor = selected
 ? resolveTokenColor('--brand-400')
 : resolveTokenColor('--border-default');

 const strokeWidth = selected ? 2.2 : 1.8;

 // Unique ID for the path (used for animation)
 const pathId = `edge-path-${id}`;

 return (
 <>
 {/* Wider invisible path for easier selection */}
 <path
 d={edgePath}
 fill="none"
 stroke="transparent"
 strokeWidth={16}
 className="react-flow__edge-interaction"
 />

 {/* Main edge path */}
 <BaseEdge
 id={pathId}
 path={edgePath}
 markerEnd={markerEnd}
 style={{
 ...style,
 stroke: strokeColor,
 strokeWidth,
 transition: 'stroke 0.2s, stroke-width 0.2s',
 }}
 />

 {/* Animated data packet flow */}
 <circle r="4" fill={strokeColor} className="drop-shadow-md">
 <animateMotion
 dur="2s"
 repeatCount="indefinite"
 keyPoints="0;1"
 keyTimes="0;1"
 calcMode="linear"
 >
 <mpath href={`#${pathId}`} />
 </animateMotion>
 <animate
 attributeName="opacity"
 values="0;1;1;0"
 keyTimes="0;0.1;0.9;1"
 dur="2s"
 repeatCount="indefinite"
 />
 </circle>

 {/* Selected state glow effect */}
 {selected && (
 <path
 d={edgePath}
 fill="none"
 stroke={strokeColor}
 strokeWidth={strokeWidth + 4}
 strokeOpacity={0.2}
 className="pointer-events-none"
 />
 )}
 </>
 );
};

export default CustomEdge;
