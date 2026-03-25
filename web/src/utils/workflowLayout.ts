import { WorkflowNode } from "../types/workflow";

type NodeType = "source" | "transform" | "destination" | string;

interface LayoutOpts {
  canvasWidth: number;
  canvasHeight: number;
  nodeWidth?: number;
  nodeHeight?: number;
  minGapX?: number;
  minGapY?: number;
  groupGapY?: number;
  margin?: number;
  order?: NodeType[];
}

export const autoLayoutDynamic = (
  list: WorkflowNode[],
  opts: LayoutOpts
): WorkflowNode[] => {
  if (!Array.isArray(list) || list.length === 0) return list;

  const {
    nodeWidth = 200,
    nodeHeight = 80,
    minGapX = 120,
    minGapY = 30,
    groupGapY = 60,
    margin = 60,
  } = opts;

  // Separate nodes by type
  const sources = list.filter(n => n.type === 'source');
  const transforms = list.filter(n => n.type === 'transform');
  const destinations = list.filter(n => n.type === 'destination');

  const result: WorkflowNode[] = [];
  let currentY = margin;

  // For each source, create a group with its connected destinations
  sources.forEach((source, sourceIdx) => {
    // Find transforms and destinations (for now, distribute evenly)
    // Each source gets its share of destinations
    const destsPerSource = Math.ceil(destinations.length / Math.max(sources.length, 1));
    const startDestIdx = sourceIdx * destsPerSource;
    const sourceDestinations = destinations.slice(startDestIdx, startDestIdx + destsPerSource);

    // Calculate group height based on max of source side vs destination side
    const destCount = sourceDestinations.length || 1;
    const groupHeight = Math.max(nodeHeight, destCount * nodeHeight + (destCount - 1) * minGapY);

    // Position source - vertically centered in the group
    const sourceY = currentY + (groupHeight - nodeHeight) / 2;
    result.push({ ...source, position: { x: margin, y: sourceY } });

    // Position destinations - stacked vertically, aligned to the right
    const destX = margin + nodeWidth + minGapX;
    const destStartY = currentY + (groupHeight - (destCount * nodeHeight + (destCount - 1) * minGapY)) / 2;

    sourceDestinations.forEach((dest, destIdx) => {
      const destY = destStartY + destIdx * (nodeHeight + minGapY);
      result.push({ ...dest, position: { x: destX, y: destY } });
    });

    // Move to next group
    currentY += groupHeight + groupGapY;
  });

  // Handle any remaining destinations not assigned to sources
  const assignedDestCount = sources.length * Math.ceil(destinations.length / Math.max(sources.length, 1));
  const remainingDests = destinations.slice(assignedDestCount);
  remainingDests.forEach((dest, idx) => {
    result.push({
      ...dest,
      position: { x: margin + nodeWidth + minGapX, y: currentY + idx * (nodeHeight + minGapY) }
    });
  });

  // Handle transforms (place between sources and destinations if present)
  if (transforms.length > 0) {
    const transformX = margin + (nodeWidth + minGapX) / 2;
    transforms.forEach((transform, idx) => {
      result.push({
        ...transform,
        position: { x: transformX, y: margin + idx * (nodeHeight + minGapY) }
      });
    });
  }

  // Handle orphan sources (sources without any destinations to pair with)
  if (sources.length === 0 && destinations.length > 0) {
    destinations.forEach((dest, idx) => {
      result.push({
        ...dest,
        position: { x: margin, y: margin + idx * (nodeHeight + minGapY) }
      });
    });
  }

  return result;
};
