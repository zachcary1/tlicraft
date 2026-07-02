export type NodeType = "Core" | "LegendaryMedium" | "Medium" | "Micro";

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  name?: string;  // Core nodes only
  icon: string;   // filename without .webp, relative to iconFolder
}

export interface TalentTreeDef {
  tree: string;        // matches the "tree" field in talent.json
  iconFolder: string;  // e.g. "god of might/god of might"
  width: number;
  height: number;
  nodes: TreeNode[];
  edges: [string, string][];
}
