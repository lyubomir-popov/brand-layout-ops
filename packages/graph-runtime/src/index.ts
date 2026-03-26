import type { GraphEdge, GraphNode, OperatorDefinition, OperatorGraph } from "@brand-layout-ops/core-types";

export class OperatorRegistry {
  private readonly definitions = new Map<string, OperatorDefinition>();

  register(definition: OperatorDefinition): void {
    this.definitions.set(definition.key, definition);
  }

  get(operatorKey: string): OperatorDefinition {
    const definition = this.definitions.get(operatorKey);
    if (!definition) {
      throw new Error(`Unknown operator: ${operatorKey}`);
    }
    return definition;
  }
}

function buildIncomingEdgeMap(nodes: GraphNode[], edges: GraphEdge[]): Map<string, GraphEdge[]> {
  const incoming = new Map<string, GraphEdge[]>();
  for (const node of nodes) {
    incoming.set(node.id, []);
  }
  for (const edge of edges) {
    incoming.get(edge.toNodeId)?.push(edge);
  }
  return incoming;
}

export function topologicallySortGraph(graph: OperatorGraph): GraphNode[] {
  const remaining = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = buildIncomingEdgeMap(graph.nodes, graph.edges);
  const sorted: GraphNode[] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining.values()).find((node) => (incoming.get(node.id)?.length || 0) === 0);
    if (!ready) {
      throw new Error("Graph contains a cycle or unresolved dependency.");
    }

    sorted.push(ready);
    remaining.delete(ready.id);

    for (const edge of graph.edges.filter((candidate) => candidate.fromNodeId === ready.id)) {
      const nextIncoming = incoming.get(edge.toNodeId) || [];
      incoming.set(
        edge.toNodeId,
        nextIncoming.filter((candidate) => candidate !== edge)
      );
    }
  }

  return sorted;
}

export async function evaluateGraph(graph: OperatorGraph, registry: OperatorRegistry): Promise<Map<string, Record<string, unknown>>> {
  const sorted = topologicallySortGraph(graph);
  const outputs = new Map<string, Record<string, unknown>>();

  for (const node of sorted) {
    const definition = registry.get(node.operatorKey);
    const inputs: Record<string, unknown> = {};
    for (const edge of graph.edges.filter((candidate) => candidate.toNodeId === node.id)) {
      const sourceOutputs = outputs.get(edge.fromNodeId);
      inputs[edge.toPortKey] = sourceOutputs?.[edge.fromPortKey];
    }
    const result = await definition.run({ params: node.params, inputs });
    outputs.set(node.id, result);
  }

  return outputs;
}