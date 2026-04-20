import { useRef, useState, useLayoutEffect } from "react";

export function useElementSize<T extends HTMLElement>() {
 const ref = useRef<T | null>(null);
 const [rect, setRect] = useState({ width: 0, height: 0 });

 useLayoutEffect(() => {
 if (!ref.current) return;
 const element = ref.current;
 const resizeObserver = new ResizeObserver(([entry]) => {
 const contentRect = entry.contentRect;
 setRect({ width: contentRect.width, height: contentRect.height });
 });
 resizeObserver.observe(element);
 return () => resizeObserver.disconnect();
 }, []);

 return { ref, ...rect } as const;
}
