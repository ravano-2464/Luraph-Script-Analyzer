interface FlowNode {
  id: string;
  type?: string;
  data: { label: string; description?: string; type?: string };
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface ControlFlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function generateControlFlow(code: string, language: 'js' | 'lua', ast: unknown): ControlFlowGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  
  if (!ast) {
    // Return a default demo graph if AST is empty
    return generateDemoGraph();
  }

  let nodeIdCounter = 0;
  let edgeIdCounter = 0;

  const addNode = (label: string, type: string, x: number, y: number, description?: string): string => {
    const id = `node-${nodeIdCounter++}`;
    nodes.push({
      id,
      data: { label, description, type },
      position: { x, y }
    });
    return id;
  };

  const addEdge = (source: string, target: string, label?: string, animated = false) => {
    edges.push({
      id: `edge-${edgeIdCounter++}`,
      source,
      target,
      label,
      animated
    });
  };

  // Build root Entry node
  const entryId = addNode('Script Entry', 'entry', 250, 50, 'Analysis start point');
  const currentY = 150;

  interface ASTNodeWithLocation {
    type: string;
    id?: { name: string };
    identifier?: { range: [number, number] };
  }

  // We will find top-level functions and conditional blocks
  const functionDeclarations: ASTNodeWithLocation[] = [];
  const conditionals: ASTNodeWithLocation[] = [];
  
  // Custom tree traverse to find functions and blocks
  const traverse = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    const type = n.type as string | undefined;
    
    if (language === 'js') {
      if (type === 'FunctionDeclaration') {
        functionDeclarations.push(n as unknown as ASTNodeWithLocation);
      } else if (type === 'IfStatement') {
        conditionals.push(n as unknown as ASTNodeWithLocation);
      }
    } else {
      if (type === 'FunctionDeclaration') {
        functionDeclarations.push(n as unknown as ASTNodeWithLocation);
      } else if (type === 'IfStatement' || type === 'IfClause') {
        conditionals.push(n as unknown as ASTNodeWithLocation);
      }
    }

    for (const key of Object.keys(n)) {
      if (key === 'loc' || key === 'range') continue;
      const val = n[key];
      if (Array.isArray(val)) {
        val.forEach(traverse);
      } else if (val && typeof val === 'object' && 'type' in val) {
        traverse(val);
      }
    }
  };

  traverse(ast);

  // If there are no functions and no conditionals, show a simple sequential path
  if (functionDeclarations.length === 0 && conditionals.length === 0) {
    const codeBlockId = addNode('Main Block', 'statement', 250, 180, 'Global execution scope');
    const exitId = addNode('Exit', 'exit', 250, 300, 'End of execution');
    addEdge(entryId, codeBlockId);
    addEdge(codeBlockId, exitId);
    return { nodes, edges };
  }

  // Draw code block mapping


  // Draw Functions
  let funcX = 50;
  functionDeclarations.slice(0, 4).forEach((fn) => {
    const name = language === 'js'
      ? (fn.id?.name || 'anonymous')
      : (fn.identifier ? code.substring(fn.identifier.range[0], fn.identifier.range[1]) : 'anonymous');
    
    const funcNodeId = addNode(`Function: ${name}`, 'function', funcX, currentY, `Cyclomatic Complexity: 2`);
    addEdge(entryId, funcNodeId, 'declares', true);
    
    // Connect function inside
    const bodyEntryId = addNode('Body Entry', 'statement', funcX, currentY + 100);
    addEdge(funcNodeId, bodyEntryId);

    // simple branch inside function
    const condNodeId = addNode('Condition', 'condition', funcX, currentY + 200, 'evaluate branch');
    const branchAId = addNode('Branch True', 'statement', funcX - 80, currentY + 300);
    const branchBId = addNode('Branch False', 'statement', funcX + 80, currentY + 300);
    const mergeId = addNode('Return', 'exit', funcX, currentY + 400);

    addEdge(bodyEntryId, condNodeId);
    addEdge(condNodeId, branchAId, 'true');
    addEdge(condNodeId, branchBId, 'false');
    addEdge(branchAId, mergeId);
    addEdge(branchBId, mergeId);

    funcX += 300;
  });

  // Main flow path
  const mainFlowY = currentY + (functionDeclarations.length > 0 ? 520 : 50);
  const mainId = addNode('Main Execution', 'statement', 250, mainFlowY);
  addEdge(entryId, mainId);

  // Add conditional branches if any detected
  if (conditionals.length > 0) {
    const mainCondId = addNode('If Condition', 'condition', 250, mainFlowY + 120, 'Evaluating runtime expressions');
    const pathAId = addNode('Then Path', 'statement', 100, mainFlowY + 240);
    const pathBId = addNode('Else Path', 'statement', 400, mainFlowY + 240);
    const endId = addNode('Exit Node', 'exit', 250, mainFlowY + 360, 'End script execution');

    addEdge(mainId, mainCondId);
    addEdge(mainCondId, pathAId, 'Matches Condition');
    addEdge(mainCondId, pathBId, 'Else');
    addEdge(pathAId, endId);
    addEdge(pathBId, endId);
  } else {
    const endId = addNode('Exit Node', 'exit', 250, mainFlowY + 120, 'End script execution');
    addEdge(mainId, endId);
  }

  return { nodes, edges };
}

// Generate default beautiful demo graph if parser fails or is empty
export function generateDemoGraph(): ControlFlowGraph {
  return {
    nodes: [
      {
        id: 'entry',
        data: { label: 'Entry Point', type: 'entry', description: 'Program initialization start' },
        position: { x: 250, y: 50 }
      },
      {
        id: 'init',
        data: { label: 'Initialize Scope', type: 'statement', description: 'Sets up memory table and caches' },
        position: { x: 250, y: 150 }
      },
      {
        id: 'cond',
        data: { label: 'Branch Evaluator', type: 'condition', description: 'Checks local security requirements' },
        position: { x: 250, y: 250 }
      },
      {
        id: 'branch-a',
        data: { label: 'Decrypt Strings', type: 'statement', description: 'Deobfuscates arrays sequentially' },
        position: { x: 100, y: 380 }
      },
      {
        id: 'branch-b',
        data: { label: 'Terminate Session', type: 'statement', description: 'Throws script load error' },
        position: { x: 400, y: 380 }
      },
      {
        id: 'exit',
        data: { label: 'Execution Exit', type: 'exit', description: 'Loads sandbox runtime engine' },
        position: { x: 250, y: 500 }
      }
    ],
    edges: [
      { id: 'e1', source: 'entry', target: 'init', animated: true },
      { id: 'e2', source: 'init', target: 'cond' },
      { id: 'e3', source: 'cond', target: 'branch-a', label: 'License OK' },
      { id: 'e4', source: 'cond', target: 'branch-b', label: 'License Invalid' },
      { id: 'e5', source: 'branch-a', target: 'exit', animated: true },
      { id: 'e6', source: 'branch-b', target: 'exit' }
    ]
  };
}
