import { vi } from 'vitest';
import React from 'react';

// =============================================================================
// ReactFlow Mock Types
// =============================================================================

export interface MockNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  selected?: boolean;
  dragging?: boolean;
}

export interface MockEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  selected?: boolean;
}

export interface MockReactFlowInstance {
  getNodes: () => MockNode[];
  getEdges: () => MockEdge[];
  setNodes: (nodes: MockNode[] | ((nodes: MockNode[]) => MockNode[])) => void;
  setEdges: (edges: MockEdge[] | ((edges: MockEdge[]) => MockEdge[])) => void;
  addNodes: (nodes: MockNode | MockNode[]) => void;
  addEdges: (edges: MockEdge | MockEdge[]) => void;
  deleteElements: (params: { nodes?: MockNode[]; edges?: MockEdge[] }) => void;
  getNode: (id: string) => MockNode | undefined;
  getEdge: (id: string) => MockEdge | undefined;
  fitView: (options?: unknown) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setCenter: (x: number, y: number, options?: unknown) => void;
  project: (position: { x: number; y: number }) => { x: number; y: number };
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  flowToScreenPosition: (position: { x: number; y: number }) => { x: number; y: number };
  viewportInitialized: boolean;
}

// =============================================================================
// Mock ReactFlow Instance
// =============================================================================

let mockNodes: MockNode[] = [];
let mockEdges: MockEdge[] = [];

export const mockReactFlowInstance: MockReactFlowInstance = {
  getNodes: vi.fn(() => mockNodes),
  getEdges: vi.fn(() => mockEdges),
  setNodes: vi.fn((nodesOrUpdater) => {
    if (typeof nodesOrUpdater === 'function') {
      mockNodes = nodesOrUpdater(mockNodes);
    } else {
      mockNodes = nodesOrUpdater;
    }
  }),
  setEdges: vi.fn((edgesOrUpdater) => {
    if (typeof edgesOrUpdater === 'function') {
      mockEdges = edgesOrUpdater(mockEdges);
    } else {
      mockEdges = edgesOrUpdater;
    }
  }),
  addNodes: vi.fn((nodes) => {
    const nodesToAdd = Array.isArray(nodes) ? nodes : [nodes];
    mockNodes = [...mockNodes, ...nodesToAdd];
  }),
  addEdges: vi.fn((edges) => {
    const edgesToAdd = Array.isArray(edges) ? edges : [edges];
    mockEdges = [...mockEdges, ...edgesToAdd];
  }),
  deleteElements: vi.fn(({ nodes = [], edges = [] }: { nodes?: Array<{ id: string }>; edges?: Array<{ id: string }> }) => {
    const nodeIds = new Set(nodes.map((n: { id: string }) => n.id));
    const edgeIds = new Set(edges.map((e: { id: string }) => e.id));
    mockNodes = mockNodes.filter((n: { id: string }) => !nodeIds.has(n.id));
    mockEdges = mockEdges.filter((e: { id: string }) => !edgeIds.has(e.id));
  }),
  getNode: vi.fn((id) => mockNodes.find((n) => n.id === id)),
  getEdge: vi.fn((id) => mockEdges.find((e) => e.id === id)),
  fitView: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  setCenter: vi.fn(),
  project: vi.fn((pos) => pos),
  screenToFlowPosition: vi.fn((pos) => pos),
  flowToScreenPosition: vi.fn((pos) => pos),
  viewportInitialized: true,
};

/**
 * Reset the mock ReactFlow instance state.
 */
export function resetMockReactFlow(): void {
  mockNodes = [];
  mockEdges = [];
  vi.clearAllMocks();
}

/**
 * Set initial nodes and edges for testing.
 */
export function setMockReactFlowState(
  nodes: MockNode[],
  edges: MockEdge[] = []
): void {
  mockNodes = [...nodes];
  mockEdges = [...edges];
}

// =============================================================================
// Mock useReactFlow Hook
// =============================================================================

export const mockUseReactFlow = vi.fn(() => mockReactFlowInstance);

// =============================================================================
// Mock ReactFlow Components
// =============================================================================

/**
 * Mock ReactFlow component.
 * Renders children and provides basic structure for testing.
 */
export const MockReactFlow = vi.fn(
  ({
    children,
    nodes,
    edges,
    onNodesChange: _onNodesChange,
    onEdgesChange: _onEdgesChange,
    onConnect: _onConnect,
    onNodeClick,
    onEdgeClick,
    onPaneClick: _onPaneClick,
    onNodeDragStop: _onNodeDragStop,
    ...props
  }: {
    children?: React.ReactNode;
    nodes?: MockNode[];
    edges?: MockEdge[];
    onNodesChange?: (changes: unknown[]) => void;
    onEdgesChange?: (changes: unknown[]) => void;
    onConnect?: (connection: unknown) => void;
    onNodeClick?: (event: unknown, node: MockNode) => void;
    onEdgeClick?: (event: unknown, edge: MockEdge) => void;
    onPaneClick?: (event: unknown) => void;
    onNodeDragStop?: (event: unknown, node: MockNode) => void;
    [key: string]: unknown;
  }) => {
    // Update internal state when props change
    if (nodes) {
      mockNodes = nodes;
    }
    if (edges) {
      mockEdges = edges;
    }

    return React.createElement(
      'div',
      {
        'data-testid': 'react-flow',
        className: 'react-flow',
        ...props,
      },
      [
        // Render nodes
        React.createElement(
          'div',
          { key: 'nodes', 'data-testid': 'react-flow-nodes' },
          (nodes || mockNodes).map((node) =>
            React.createElement('div', {
              key: node.id,
              'data-testid': `rf-node-${node.id}`,
              'data-nodeid': node.id,
              className: `react-flow__node ${node.selected ? 'selected' : ''}`,
              onClick: (e: React.MouseEvent) => onNodeClick?.(e, node),
            })
          )
        ),
        // Render edges
        React.createElement(
          'div',
          { key: 'edges', 'data-testid': 'react-flow-edges' },
          (edges || mockEdges).map((edge) =>
            React.createElement('div', {
              key: edge.id,
              'data-testid': `rf-edge-${edge.id}`,
              'data-edgeid': edge.id,
              className: `react-flow__edge ${edge.selected ? 'selected' : ''}`,
              onClick: (e: React.MouseEvent) => onEdgeClick?.(e, edge),
            })
          )
        ),
        // Render children (controls, panels, etc.)
        children,
      ]
    );
  }
);

/**
 * Mock ReactFlowProvider component.
 */
export const MockReactFlowProvider = vi.fn(
  ({ children }: { children: React.ReactNode }) => {
    return React.createElement('div', { 'data-testid': 'react-flow-provider' }, children);
  }
);

/**
 * Mock Background component.
 */
export const MockBackground = vi.fn(() => {
  return React.createElement('div', { 'data-testid': 'react-flow-background' });
});

/**
 * Mock Controls component.
 */
export const MockControls = vi.fn(() => {
  return React.createElement('div', { 'data-testid': 'react-flow-controls' });
});

/**
 * Mock MiniMap component.
 */
export const MockMiniMap = vi.fn(() => {
  return React.createElement('div', { 'data-testid': 'react-flow-minimap' });
});

/**
 * Mock Panel component.
 */
export const MockPanel = vi.fn(
  ({ children, position }: { children: React.ReactNode; position?: string }) => {
    return React.createElement(
      'div',
      {
        'data-testid': 'react-flow-panel',
        'data-position': position,
      },
      children
    );
  }
);

/**
 * Mock Handle component.
 */
export const MockHandle = vi.fn(
  ({ type, position, id }: { type: 'source' | 'target'; position: string; id?: string }) => {
    return React.createElement('div', {
      'data-testid': `react-flow-handle-${type}`,
      'data-handleid': id,
      'data-handlepos': position,
      className: `react-flow__handle react-flow__handle-${position}`,
    });
  }
);

// =============================================================================
// Mock Hooks
// =============================================================================

export const mockUseNodes = vi.fn(() => mockNodes);
export const mockUseEdges = vi.fn(() => mockEdges);
export const mockUseNodesState = vi.fn(() => [
  mockNodes,
  mockReactFlowInstance.setNodes,
  vi.fn(), // onNodesChange
]);
export const mockUseEdgesState = vi.fn(() => [
  mockEdges,
  mockReactFlowInstance.setEdges,
  vi.fn(), // onEdgesChange
]);
export const mockUseOnViewportChange = vi.fn();
export const mockUseNodeId = vi.fn(() => 'test-node-id');
export const mockUseStore = vi.fn(() => ({}));

// =============================================================================
// Module Mock Setup
// =============================================================================

/**
 * Complete reactflow mock setup.
 * Use this in vi.mock() at the top of your test file.
 */
export const reactFlowMock = {
  ReactFlow: MockReactFlow,
  ReactFlowProvider: MockReactFlowProvider,
  Background: MockBackground,
  Controls: MockControls,
  MiniMap: MockMiniMap,
  Panel: MockPanel,
  Handle: MockHandle,
  useReactFlow: mockUseReactFlow,
  useNodes: mockUseNodes,
  useEdges: mockUseEdges,
  useNodesState: mockUseNodesState,
  useEdgesState: mockUseEdgesState,
  useOnViewportChange: mockUseOnViewportChange,
  useNodeId: mockUseNodeId,
  useStore: mockUseStore,
  // Re-export commonly used utilities
  addEdge: vi.fn((edge: unknown, edges: unknown[]) => [...edges, edge]),
  applyNodeChanges: vi.fn((_changes: unknown[], nodes: unknown[]) => [...nodes]),
  applyEdgeChanges: vi.fn((_changes: unknown[], edges: unknown[]) => [...edges]),
  getConnectedEdges: vi.fn(() => []),
  getIncomers: vi.fn(() => []),
  getOutgoers: vi.fn(() => []),
  // Position constants
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
  // Marker types
  MarkerType: {
    Arrow: 'arrow',
    ArrowClosed: 'arrowclosed',
  },
};

/**
 * Example usage in test files:
 *
 * vi.mock('reactflow', () => reactFlowMock);
 *
 * Or for more control:
 *
 * vi.mock('reactflow', () => ({
 *   ...reactFlowMock,
 *   useReactFlow: () => ({
 *     ...mockReactFlowInstance,
 *     getNodes: () => [customNode],
 *   }),
 * }));
 */
