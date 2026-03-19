import { z } from 'zod';
import React from 'react';

export type Port = {
  id: string;
  name: string;
  io: 'input' | 'output';
  dataType?: string;
  required?: boolean;
  multiple?: boolean;
};

export type NodeSpec = {
  typeId: string;
  displayName: string;
  category: 'SOURCE' | 'TRANSFORM' | 'DESTINATION';
  icon: string;
  color: string;
  ports: Port[];
  defaults: Record<string, unknown>;
  paramsSchema: z.ZodTypeAny;
  ui: {
    /** Lazy-loaded editor component for code splitting */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor: React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any>;
  };
  adapters: {
    toBackend: (
      _params: Record<string, unknown>
    ) => {
      node_id: string;
      node_type: 'source' | 'transform' | 'destinations';
      parameters: Record<string, unknown>;
    };
    fromBackend: (
      _nodeId: string,
      _nodeType: string,
      _parameters: Record<string, unknown>
    ) => { typeId: string; params: Record<string, unknown> };
  };
  /**
   * Optional function to generate a descriptive display name based on node parameters.
   * Used to auto-generate names like "Facebook Ads - Age" when breakdowns are selected.
   * @param params - The node's current parameters
   * @returns A descriptive name string, or undefined to use the default displayName
   */
  generateDisplayName?: (params: Record<string, unknown>) => string | undefined;
  /**
   * Optional function to dynamically generate ports based on node parameters.
   * Used for destination nodes that can optionally pass data through to downstream nodes.
   * @param params - The node's current parameters
   * @returns Array of ports for this node
   */
  getDynamicPorts?: (params: Record<string, unknown>) => Port[];
};
