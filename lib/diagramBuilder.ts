/**
 * diagramBuilder.ts
 *
 * Converts a structured JSON diagram spec into valid Mermaid flowchart syntax.
 * This is the Single Source of Truth for Mermaid generation — the LLM never
 * writes raw Mermaid anymore, it outputs JSON which this function converts.
 * Because OUR code generates the syntax, parser errors are structurally impossible.
 */

export interface DiagramNode {
  id: string;
  label: string;
  shape?: 'rect' | 'round' | 'diamond' | 'cylinder' | 'stadium';
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: '-->' | '---' | '-.->';
}

export interface DiagramGroup {
  id: string;
  label: string;
  contains: string[];
}

export interface DiagramSpec {
  direction?: 'TD' | 'LR' | 'BT' | 'RL';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
}

/**
 * Sanitize a node ID: strip all non-alphanumeric / underscore characters.
 * Ensures IDs are always safe regardless of what the LLM provides.
 */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
}

/**
 * Sanitize a label: replace inner double-quotes with single-quotes so we can
 * safely wrap the whole label in double-quotes.
 */
function safeLabel(label: string): string {
  return label.replace(/"/g, "'");
}

const SHAPE_RENDERERS: Record<
  NonNullable<DiagramNode['shape']>,
  (id: string, label: string) => string
> = {
  rect:     (id, label) => `${id}["${label}"]`,
  round:    (id, label) => `${id}("${label}")`,
  diamond:  (id, label) => `${id}{"${label}"}`,
  cylinder: (id, label) => `${id}[("${label}")]`,
  stadium:  (id, label) => `${id}(["${label}"])`,
};

export function buildMermaid(spec: DiagramSpec): string {
  const dir = spec.direction ?? 'TD';
  const lines: string[] = [`flowchart ${dir}`];
  const indent = '    ';

  // Build a set of node IDs that belong to a group (rendered inside subgraph)
  const groupedIds = new Set<string>();
  (spec.groups ?? []).forEach(g => g.contains.forEach(id => groupedIds.add(id)));

  // ── Ungrouped nodes ───────────────────────────────────────────────────────
  spec.nodes
    .filter(n => !groupedIds.has(n.id))
    .forEach(n => {
      const render = SHAPE_RENDERERS[n.shape ?? 'rect'];
      lines.push(`${indent}${render(safeId(n.id), safeLabel(n.label))}`);
    });

  // ── Subgraphs ─────────────────────────────────────────────────────────────
  (spec.groups ?? []).forEach(g => {
    lines.push(`${indent}subgraph ${safeId(g.id)}["${safeLabel(g.label)}"]`);
    g.contains.forEach(nodeId => {
      const node = spec.nodes.find(n => n.id === nodeId);
      if (!node) return;
      const render = SHAPE_RENDERERS[node.shape ?? 'rect'];
      lines.push(`${indent}${indent}${render(safeId(node.id), safeLabel(node.label))}`);
    });
    lines.push(`${indent}end`);
  });

  // ── Edges ─────────────────────────────────────────────────────────────────
  spec.edges.forEach(e => {
    const from  = safeId(e.from);
    const to    = safeId(e.to);
    const arrow = e.style ?? '-->';
    if (e.label) {
      lines.push(`${indent}${from} ${arrow}|"${safeLabel(e.label)}"| ${to}`);
    } else {
      lines.push(`${indent}${from} ${arrow} ${to}`);
    }
  });

  return lines.join('\n');
}

/**
 * Parse and convert a raw JSON string into a Mermaid diagram.
 * Returns null if the JSON is invalid or the spec doesn't have required fields.
 */
export function jsonToDiagram(raw: string): string | null {
  try {
    const spec = JSON.parse(raw) as DiagramSpec;
    if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges)) return null;
    return buildMermaid(spec);
  } catch {
    return null;
  }
}
