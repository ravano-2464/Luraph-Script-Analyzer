import * as babelParser from '@babel/parser';
import * as luaparse from 'luaparse';

export interface ASTExplorerNode {
  id: string;
  type: string;
  label: string;
  range: [number, number];
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  children: ASTExplorerNode[];
}

interface BabelASTNode {
  type: string;
  start?: number;
  end?: number;
  name?: string;
  value?: unknown;
  raw?: string;
  id?: { name: string };
  key?: { name: string };
  loc?: {
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
  [key: string]: unknown;
}

interface LuaASTNode {
  type: string;
  range?: [number, number];
  name?: string;
  raw?: string;
  value?: unknown;
  variables?: Array<{ name: string }>;
  identifier?: { range: [number, number] };
  loc?: {
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
  [key: string]: unknown;
}

export function parseJavaScript(code: string): unknown {
  return babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
  });
}

export function parseLua(code: string): unknown {
  return luaparse.parse(code, {
    locations: true,
    ranges: true,
    onCreateNode: () => {},
  });
}

// Convert Babel JS AST node to Unified ASTExplorerNode
export function convertBabelToUnified(node: unknown, code: string, idCounter = { val: 0 }): ASTExplorerNode | null {
  if (!node || typeof node !== 'object') {
    return null;
  }
  
  const n = node as BabelASTNode;
  if (!n.type) return null;

  const id = `js-${n.type}-${idCounter.val++}`;
  const start = n.start ?? 0;
  const end = n.end ?? 0;

  // Extract a helpful label for the explorer
  let label = n.type;
  if (n.type === 'Identifier') {
    label = `Identifier: ${n.name || ''}`;
  } else if (n.type === 'StringLiteral' || n.type === 'Literal') {
    label = `Literal: "${String(n.value ?? n.raw ?? '')}"`;
  } else if (n.type === 'NumericLiteral') {
    label = `Numeric: ${n.value}`;
  } else if (n.type === 'VariableDeclarator') {
    label = `VariableDeclarator: ${n.id?.name || ''}`;
  } else if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') {
    label = `${n.type}: ${n.id?.name || 'anonymous'}`;
  } else if (n.type === 'ClassDeclaration') {
    label = `Class: ${n.id?.name || 'anonymous'}`;
  }

  const children: ASTExplorerNode[] = [];

  // Recursively process child properties
  for (const key of Object.keys(n)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue;
    const value = n[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const child = convertBabelToUnified(item, code, idCounter);
        if (child) children.push(child);
      }
    } else if (value && typeof value === 'object') {
      const child = convertBabelToUnified(value, code, idCounter);
      if (child) children.push(child);
    }
  }

  return {
    id,
    type: n.type,
    label,
    range: [start, end],
    loc: {
      start: {
        line: n.loc?.start?.line ?? 1,
        column: n.loc?.start?.column ?? 0,
      },
      end: {
        line: n.loc?.end?.line ?? 1,
        column: n.loc?.end?.column ?? 0,
      },
    },
    children,
  };
}

// Convert Luaparse Lua AST node to Unified ASTExplorerNode
export function convertLuaToUnified(node: unknown, code: string, idCounter = { val: 0 }): ASTExplorerNode | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const n = node as LuaASTNode;
  if (!n.type) return null;

  const id = `lua-${n.type}-${idCounter.val++}`;
  const start = n.range ? n.range[0] : 0;
  const end = n.range ? n.range[1] : 0;

  // Extract a helpful label for the explorer
  let label = n.type;
  if (n.type === 'Identifier') {
    label = `Identifier: ${n.name || ''}`;
  } else if (n.type === 'StringLiteral') {
    label = `StringLiteral: ${n.raw || `"${n.value || ''}"`}`;
  } else if (n.type === 'NumericLiteral') {
    label = `NumericLiteral: ${n.value || ''}`;
  } else if (n.type === 'BooleanLiteral') {
    label = `BooleanLiteral: ${n.value || ''}`;
  } else if (n.type === 'LocalStatement') {
    const names = n.variables?.map((v) => v.name).join(', ') || '';
    label = `Local: ${names}`;
  } else if (n.type === 'FunctionDeclaration') {
    const name = n.identifier ? code.substring(n.identifier.range[0], n.identifier.range[1]) : 'anonymous';
    label = `Function: ${name}`;
  }

  const children: ASTExplorerNode[] = [];

  // Recursively process child properties
  for (const key of Object.keys(n)) {
    if (key === 'loc' || key === 'range' || key === 'type') continue;
    const value = n[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const child = convertLuaToUnified(item, code, idCounter);
        if (child) children.push(child);
      }
    } else if (value && typeof value === 'object') {
      const child = convertLuaToUnified(value, code, idCounter);
      if (child) children.push(child);
    }
  }

  return {
    id,
    type: n.type,
    label,
    range: [start, end],
    loc: {
      start: {
        line: n.loc?.start?.line ?? 1,
        column: n.loc?.start?.column ?? 0,
      },
      end: {
        line: n.loc?.end?.line ?? 1,
        column: n.loc?.end?.column ?? 0,
      },
    },
    children,
  };
}

export function generateUnifiedAST(code: string, language: 'js' | 'lua'): ASTExplorerNode | null {
  try {
    if (language === 'js') {
      const ast = parseJavaScript(code) as Record<string, unknown>;
      return convertBabelToUnified(ast.program ?? ast, code);
    } else {
      const ast = parseLua(code);
      return convertLuaToUnified(ast, code);
    }
  } catch (error) {
    console.error('Failed to parse AST:', error);
    return null;
  }
}
