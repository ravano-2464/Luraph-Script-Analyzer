/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseJavaScript, parseLua } from './parser-adapter';

// Generic AST node walker helper
export function walkAST(node: any, visit: (node: any, parent: any | null) => void, parent: any | null = null) {
  if (!node || typeof node !== 'object') return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range' || key === 'type') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        walkAST(item, visit, node);
      }
    } else if (value && typeof value === 'object' && value.type) {
      walkAST(value, visit, node);
    }
  }
}

// Entropy calculation for encoded string detection
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const freqs: Record<string, number> = {};
  for (const char of str) {
    freqs[char] = (freqs[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char of Object.keys(freqs)) {
    const p = freqs[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Regex patterns
const URL_REGEX = /https?:\/\/[^\s"'`<>]+/;
const IP_REGEX = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
const PATH_REGEX = /^(?:\.?\.?\/[a-zA-Z0-9_\-\.\/]+|\b[a-zA-Z]:\\[a-zA-Z0-9_\-\.\\ ]+)$/;
const API_REGEX = /^\/api\/[a-zA-Z0-9_\-\/]+$/;
const BASE64_REGEX = /^[a-zA-Z0-9+/=]+$/;

export interface ExtractedString {
  value: string;
  category: 'URL' | 'IP' | 'Path' | 'APIEndpoint' | 'Encoded' | 'Normal' | 'ErrorMessage';
  confidence?: number;
  line?: number;
  column?: number;
}

export interface ExtractedFunction {
  name: string;
  params: string[];
  startLine: number;
  endLine: number;
  cyclomaticComplexity: number;
  callCount: number;
  riskScore: number;
  sourceCode?: string;
}

export interface ExtractedDependency {
  name: string;
  type: 'External' | 'Internal' | 'BrowserAPI' | 'NodeAPI' | 'Unknown';
}

export interface ExtractedNetworkEvent {
  url: string;
  method?: string;
  type: 'fetch' | 'xhr' | 'websocket' | 'http_library';
  line?: number;
}

export interface ExtractedSecurityFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  message: string;
  line?: number;
  codeSnippet?: string;
}

export interface CodeMetrics {
  loc: number;
  functionCount: number;
  variableCount: number;
  stringCount: number;
  branchCount: number;
  loopCount: number;
  cyclomaticComplexity: number;
  maxNestingDepth: number;
}

export interface AnalysisResult {
  obfuscationScore: number;
  riskScore: number;
  detectedPatterns: string[];
  strings: ExtractedString[];
  functions: ExtractedFunction[];
  dependencies: ExtractedDependency[];
  networkEvents: ExtractedNetworkEvent[];
  securityFindings: ExtractedSecurityFinding[];
  metrics: CodeMetrics;
}

// Main static analysis runner
export function runStaticAnalysis(code: string, language: 'js' | 'lua'): AnalysisResult {
  // Setup defaults
  const strings: ExtractedString[] = [];
  const functions: ExtractedFunction[] = [];
  const dependencies: ExtractedDependency[] = [];
  const networkEvents: ExtractedNetworkEvent[] = [];
  const securityFindings: ExtractedSecurityFinding[] = [];
  const detectedPatterns = new Set<string>();

  let ast: any = null;
  try {
    if (language === 'js') {
      ast = parseJavaScript(code);
    } else {
      ast = parseLua(code);
    }
  } catch (error) {
    console.error('AST Generation failed during static analysis:', error);
  }

  // Calculate lines of code
  const codeLines = code.split('\n');
  const loc = codeLines.length;

  let variableCount = 0;
  let branchCount = 0;
  let loopCount = 0;
  let maxNestingDepth = 0;
  let currentNestingDepth = 0;

  const identifiers: string[] = [];

  // If parsing failed, we do a basic regex-based analysis to avoid crashing entirely
  if (!ast) {
    // Basic regex-based analysis
    return runBasicRegexFallback(code, language);
  }

  // Node visitor walk
  walkAST(ast, (node, parent) => {
    const type = node.type;

    // Nesting depth calculation
    const isControlStructure = [
      'IfStatement', 'ForStatement', 'WhileStatement', 'DoWhileStatement', 'SwitchStatement',
      'IfClause', 'ElseifClause', 'ForGenericStatement', 'ForNumericStatement', 'WhileStatement', 'RepeatStatement'
    ].includes(type);

    if (isControlStructure) {
      currentNestingDepth++;
      if (currentNestingDepth > maxNestingDepth) {
        maxNestingDepth = currentNestingDepth;
      }
    }

    // --- STRINGS ANALYSIS ---
    let stringVal: string | null = null;
    const sLine = node.loc?.start?.line;
    const sCol = node.loc?.start?.column;

    if (language === 'js') {
      if (type === 'StringLiteral') {
        stringVal = node.value;
      } else if (type === 'TemplateElement') {
        stringVal = node.value?.raw || '';
      }
    } else {
      if (type === 'StringLiteral') {
        stringVal = node.value;
      }
    }

    if (stringVal !== null) {
      const trimmed = stringVal.trim();
      let category: ExtractedString['category'] = 'Normal';
      let confidence = 0;

      if (URL_REGEX.test(trimmed)) {
        category = 'URL';
      } else if (IP_REGEX.test(trimmed)) {
        category = 'IP';
      } else if (PATH_REGEX.test(trimmed) && trimmed.length > 2 && trimmed.length < 150) {
        category = 'Path';
      } else if (API_REGEX.test(trimmed)) {
        category = 'APIEndpoint';
      } else if (trimmed.toLowerCase().includes('error') || trimmed.toLowerCase().includes('failed') || trimmed.toLowerCase().includes('exception')) {
        category = 'ErrorMessage';
      } else {
        // Evaluate if string looks encoded
        const entropy = calculateEntropy(stringVal);
        const hasHexEscapes = stringVal.includes('\\x') || stringVal.includes('\\u') || (language === 'lua' && /\\\d{3}/.test(stringVal));
        const isHexLike = /^[a-fA-F0-9]{8,}$/.test(trimmed);
        const isBase64Like = BASE64_REGEX.test(trimmed) && trimmed.length > 12 && (trimmed.endsWith('=') || trimmed.length % 4 === 0);

        if (hasHexEscapes) {
          category = 'Encoded';
          confidence = 90;
        } else if (isHexLike && trimmed.length > 16) {
          category = 'Encoded';
          confidence = 80;
        } else if (isBase64Like && entropy > 4.2) {
          category = 'Encoded';
          confidence = 75;
        } else if (entropy > 4.7 && stringVal.length > 12) {
          category = 'Encoded';
          confidence = Math.min(Math.round(entropy * 18), 100);
        }
      }

      strings.push({
        value: stringVal.length > 500 ? stringVal.substring(0, 500) + '...' : stringVal,
        category,
        confidence: category === 'Encoded' ? confidence : undefined,
        line: sLine,
        column: sCol,
      });
    }

    // --- VARIABLES & IDENTIFIERS ---
    if (type === 'Identifier') {
      identifiers.push(node.name);
      if (parent && (
        parent.type === 'VariableDeclarator' && parent.id === node ||
        parent.type === 'LocalStatement' ||
        (language === 'lua' && parent.type === 'LocalStatement' && parent.variables?.includes(node))
      )) {
        variableCount++;
      }
    }

    // --- CONTROL FLOW ---
    if ([
      'IfStatement', 'SwitchCase', 'ConditionalExpression',
      'IfClause', 'ElseifClause'
    ].includes(type)) {
      branchCount++;
    }

    if ([
      'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement',
      'ForGenericStatement', 'ForNumericStatement', 'RepeatStatement'
    ].includes(type)) {
      loopCount++;
    }

    // --- FUNCTIONS ---
    let funcName = '';
    let params: string[] = [];
    const startLine = node.loc?.start?.line ?? 1;
    const endLine = node.loc?.end?.line ?? 1;
    let isFunc = false;

    if (language === 'js') {
      if (type === 'FunctionDeclaration') {
        funcName = node.id?.name || 'anonymous';
        params = node.params?.map((p: any) => p.name || p.type) || [];
        isFunc = true;
      } else if (type === 'FunctionExpression' || type === 'ArrowFunctionExpression') {
        funcName = parent?.type === 'VariableDeclarator' && parent.id?.name ? parent.id.name : 'anonymous';
        params = node.params?.map((p: any) => p.name || p.type) || [];
        isFunc = true;
      } else if (type === 'ClassMethod') {
        funcName = node.key?.name || 'method';
        params = node.params?.map((p: any) => p.name) || [];
        isFunc = true;
      }
    } else {
      if (type === 'FunctionDeclaration') {
        funcName = node.identifier ? code.substring(node.identifier.range[0], node.identifier.range[1]) : 'anonymous';
        params = node.parameters?.map((p: any) => p.name) || [];
        isFunc = true;
      }
    }

    if (isFunc) {
      // Calculate local cyclomatic complexity within this function block
      let localBranches = 1;
      walkAST(node, (child) => {
        if ([
          'IfStatement', 'SwitchCase', 'ConditionalExpression', 'LogicalExpression',
          'IfClause', 'ElseifClause'
        ].includes(child.type)) {
          localBranches++;
        }
      });

      // Calculate simple risk score
      let riskScore = 10; // base risk
      if (localBranches > 15) riskScore += 30; // complex flow
      if (params.length > 6) riskScore += 10;  // excessive arguments

      functions.push({
        name: funcName,
        params,
        startLine,
        endLine,
        cyclomaticComplexity: localBranches,
        callCount: 0, // Calculated separately
        riskScore: Math.min(riskScore, 100),
      });
    }

    // --- DEPENDENCIES & LIBRARIES ---
    if (language === 'js') {
      if (type === 'ImportDeclaration') {
        const source = node.source?.value;
        if (source) {
          dependencies.push({
            name: source,
            type: source.startsWith('.') ? 'Internal' : 'External',
          });
        }
      } else if (type === 'CallExpression' && node.callee?.name === 'require') {
        const arg = node.arguments?.[0]?.value;
        if (arg && typeof arg === 'string') {
          const isNode = ['fs', 'path', 'child_process', 'crypto', 'net', 'http', 'os', 'util'].includes(arg);
          dependencies.push({
            name: arg,
            type: isNode ? 'NodeAPI' : (arg.startsWith('.') ? 'Internal' : 'External'),
          });
        }
      }
    } else {
      if (type === 'CallExpression' && node.base?.name === 'require') {
        const arg = node.arguments?.[0]?.value;
        if (arg && typeof arg === 'string') {
          dependencies.push({
            name: arg,
            type: 'External',
          });
        }
      }
    }

    // --- SECURITY FINDINGS (RULES ENGINE) ---
    // Rule definitions
    let severity: ExtractedSecurityFinding['severity'] | null = null;
    let secCategory = '';
    let message = '';
    const line = node.loc?.start?.line;

    if (language === 'js') {
      // 1. Eval usage
      if (type === 'CallExpression' && node.callee?.name === 'eval') {
        severity = 'CRITICAL';
        secCategory = 'Dynamic Execution';
        message = 'Direct call to eval() found. This allows execution of dynamic script contents and bypasses security protections.';
      }
      // 2. Function constructor
      if (type === 'NewExpression' && node.callee?.name === 'Function') {
        severity = 'CRITICAL';
        secCategory = 'Dynamic Execution';
        message = 'Usage of new Function(...) constructor. Evaluates string inputs as execution threads.';
      }
      // 3. Child process / shell execution
      if (type === 'CallExpression' &&
        (node.callee?.object?.name === 'child_process' || node.callee?.property?.name === 'exec' || node.callee?.property?.name === 'spawn')
      ) {
        severity = 'HIGH';
        secCategory = 'Process Execution';
        message = 'Process execution library execution call (exec/spawn) detected.';
      }
      // 4. fs module usage
      if (type === 'CallExpression' && node.callee?.name === 'require' && node.arguments?.[0]?.value === 'fs') {
        severity = 'HIGH';
        secCategory = 'File System Access';
        message = 'Requesting filesystem module ("fs") to access file assets.';
      }
      // 5. Dynamic property access lookups on global arrays (classic obfuscation lookup)
      if (type === 'MemberExpression' && node.computed && node.property?.type === 'NumericLiteral' && node.object?.type === 'Identifier') {
        const parentName = node.object.name;
        if (parentName.startsWith('_0x') || parentName.length < 3) {
          severity = 'MEDIUM';
          secCategory = 'Obfuscation Lookup';
          message = `Dynamic array index retrieval (${parentName}[${node.property.value}]) found, typical of string lookup tables.`;
        }
      }
    } else {
      // Lua Rules
      // 1. load / loadstring
      if (type === 'CallExpression' && (node.base?.name === 'load' || node.base?.name === 'loadstring')) {
        severity = 'CRITICAL';
        secCategory = 'Dynamic Execution';
        message = `Dynamic code load function (${node.base.name}) detected.`;
      }
      // 2. os.execute / io.popen
      if (type === 'CallExpression' && (
        (node.base?.type === 'MemberExpression' && node.base.indexer === '.' && node.base.identifier?.name === 'execute' && node.base.base?.name === 'os') ||
        (node.base?.type === 'MemberExpression' && node.base.indexer === '.' && node.base.identifier?.name === 'popen' && node.base.base?.name === 'io')
      )) {
        severity = 'HIGH';
        secCategory = 'Shell Execution';
        message = 'Shell executing commands via os.execute/io.popen detected.';
      }
      // 3. getfenv / setfenv
      if (type === 'CallExpression' && (node.base?.name === 'getfenv' || node.base?.name === 'setfenv')) {
        severity = 'HIGH';
        secCategory = 'Environment Modification';
        message = `Environment scoping lookup hook (${node.base.name}) found. Modifies sandbox boundaries.`;
      }
    }

    if (severity !== null) {
      let codeSnippet = '';
      if (line && line <= loc) {
        codeSnippet = codeLines[line - 1]?.trim() || '';
      }
      securityFindings.push({
        severity,
        category: secCategory,
        message,
        line,
        codeSnippet,
      });
    }

    // --- NETWORK DETECTION ---
    let netUrl = '';
    let netType: ExtractedNetworkEvent['type'] = 'fetch';

    if (language === 'js') {
      if (type === 'CallExpression') {
        const calleeName = node.callee?.name;
        if (calleeName === 'fetch') {
          netUrl = node.arguments?.[0]?.value || 'Dynamic Endpoint';
          netType = 'fetch';
        } else if (calleeName === 'open' && node.callee?.object?.type === 'NewExpression' && node.callee.object.callee?.name === 'XMLHttpRequest') {
          netUrl = node.arguments?.[1]?.value || 'Dynamic XHR';
          netType = 'xhr';
        }
      } else if (type === 'NewExpression' && node.callee?.name === 'WebSocket') {
        netUrl = node.arguments?.[0]?.value || 'Dynamic WS';
        netType = 'websocket';
      }
    }

    if (netUrl) {
      networkEvents.push({
        url: typeof netUrl === 'string' ? netUrl : 'Dynamic URL Path',
        type: netType,
        line: node.loc?.start?.line,
      });
    }

  }, null);

  // Post-process networks from extracted strings
  for (const s of strings) {
    if (s.category === 'URL') {
      // Check if not already in network events
      if (!networkEvents.some(n => n.url === s.value)) {
        networkEvents.push({
          url: s.value,
          type: 'http_library',
          line: s.line,
        });
      }
    }
  }

  // --- OBFUSCATION DETECTOR & PATTERNS ---
  // 1. Long variable names check
  const longIdentifiers = identifiers.filter(id => id.length > 25);
  const hexIdentifiers = identifiers.filter(id => /^_(0x)?[a-fA-F0-9]{4,}/.test(id));
  const oneCharIdentifiers = identifiers.filter(id => id.length === 1);

  if (longIdentifiers.length > 5) {
    detectedPatterns.add('Extremely long variable names');
  }
  if (hexIdentifiers.length > 5) {
    detectedPatterns.add('Random identifiers (Hex patterns)');
  }
  if (oneCharIdentifiers.length / (identifiers.length || 1) > 0.4 && identifiers.length > 15) {
    detectedPatterns.add('Extreme identifier minification');
  }

  const encodedStrings = strings.filter(s => s.category === 'Encoded');
  if (encodedStrings.length / (strings.length || 1) > 0.3 && strings.length > 5) {
    detectedPatterns.add('Excessive string encoding');
  }

  if (strings.some(s => s.category === 'Encoded' && s.confidence && s.confidence > 85)) {
    detectedPatterns.add('Array-based string lookup / Cryptographic structures');
  }

  // Check for control flow flattening (loop containing giant switch/nested ifs)
  let flatteningCount = 0;
  walkAST(ast, (node) => {
    if (['ForStatement', 'WhileStatement', 'RepeatStatement'].includes(node.type)) {
      // Check if child has a switch statement or dense nested ifs
      let hasSwitch = false;
      let denseIf = 0;
      walkAST(node, (child) => {
        if (child.type === 'SwitchStatement' || child.type === 'SwitchCase') {
          hasSwitch = true;
        }
        if (child.type === 'IfStatement' || child.type === 'IfClause') {
          denseIf++;
        }
      });
      if (hasSwitch || denseIf > 8) {
        flatteningCount++;
      }
    }
  });

  if (flatteningCount > 0) {
    detectedPatterns.add('Control-flow flattening patterns');
  }

  if (maxNestingDepth > 6) {
    detectedPatterns.add('Highly nested expressions');
  }

  // Calculate Obfuscation Score (0 - 100)
  let obfuscationScore = 10; // base score
  if (detectedPatterns.has('Random identifiers (Hex patterns)')) obfuscationScore += 25;
  if (detectedPatterns.has('Excessive string encoding')) obfuscationScore += 25;
  if (detectedPatterns.has('Control-flow flattening patterns')) obfuscationScore += 25;
  if (detectedPatterns.has('Highly nested expressions')) obfuscationScore += 10;
  if (detectedPatterns.has('Extreme identifier minification')) obfuscationScore += 10;
  if (obfuscationScore > 100) obfuscationScore = 100;

  // Calculate overall Cyclomatic Complexity
  let cyclomaticComplexity = 1;
  for (const f of functions) {
    cyclomaticComplexity += f.cyclomaticComplexity - 1;
  }

  // Calculate Risk Score (0 - 100)
  let riskScore = 5;
  const criticalFindings = securityFindings.filter(f => f.severity === 'CRITICAL');
  const highFindings = securityFindings.filter(f => f.severity === 'HIGH');
  const mediumFindings = securityFindings.filter(f => f.severity === 'MEDIUM');

  riskScore += criticalFindings.length * 35;
  riskScore += highFindings.length * 15;
  riskScore += mediumFindings.length * 5;
  if (riskScore > 100) riskScore = 100;

  const metrics: CodeMetrics = {
    loc,
    functionCount: functions.length,
    variableCount,
    stringCount: strings.length,
    branchCount,
    loopCount,
    cyclomaticComplexity,
    maxNestingDepth,
  };

  return {
    obfuscationScore,
    riskScore,
    detectedPatterns: Array.from(detectedPatterns),
    strings,
    functions,
    dependencies,
    networkEvents,
    securityFindings,
    metrics,
  };
}

// Basic regex-based analysis fallback when AST parsing fails entirely
function runBasicRegexFallback(code: string, language: 'js' | 'lua'): AnalysisResult {
  const strings: ExtractedString[] = [];
  const functions: ExtractedFunction[] = [];
  const dependencies: ExtractedDependency[] = [];
  const networkEvents: ExtractedNetworkEvent[] = [];
  const securityFindings: ExtractedSecurityFinding[] = [];
  const detectedPatterns = new Set<string>();

  const codeLines = code.split('\n');
  const loc = codeLines.length;

  // Extract strings via regex
  const strRegex = language === 'js'
    ? /(?:["'])(?:\\.|[^\\])*?(?:["'])/g
    : /(?:["'])(?:\\.|[^\\])*?(?:["'])|\[\[[\s\S]*?\]\]/g;

  let match;
  while ((match = strRegex.exec(code)) !== null) {
    const rawVal = match[0];
    const stringVal = rawVal.startsWith('[[') ? rawVal.slice(2, -2) : rawVal.slice(1, -1);
    const trimmed = stringVal.trim();
    if (trimmed.length === 0) continue;

    let category: ExtractedString['category'] = 'Normal';
    if (URL_REGEX.test(trimmed)) {
      category = 'URL';
    } else if (IP_REGEX.test(trimmed)) {
      category = 'IP';
    } else if (PATH_REGEX.test(trimmed)) {
      category = 'Path';
    }

    strings.push({
      value: stringVal.length > 200 ? stringVal.substring(0, 200) + '...' : stringVal,
      category,
    });
  }

  // Identify suspicious patterns in text
  if (code.includes('eval(') || code.includes('eval (')) {
    securityFindings.push({
      severity: 'CRITICAL',
      category: 'Dynamic Execution',
      message: 'Direct call to eval() was detected via static signature scan.',
    });
  }
  if (language === 'lua' && (code.includes('loadstring(') || code.includes('load('))) {
    securityFindings.push({
      severity: 'CRITICAL',
      category: 'Dynamic Execution',
      message: 'Lua load/loadstring signature detected in content.',
    });
  }

  if (/_0x[a-fA-F0-9]{4,}/.test(code)) {
    detectedPatterns.add('Random identifiers (Hex patterns)');
  }
  if (code.includes('\\x') || code.includes('\\u')) {
    detectedPatterns.add('Excessive string encoding');
  }

  let obfuscationScore = 30;
  if (detectedPatterns.size > 0) {
    obfuscationScore = 70;
  }

  const metrics: CodeMetrics = {
    loc,
    functionCount: 0,
    variableCount: 0,
    stringCount: strings.length,
    branchCount: 0,
    loopCount: 0,
    cyclomaticComplexity: 1,
    maxNestingDepth: 0,
  };

  return {
    obfuscationScore,
    riskScore: securityFindings.length > 0 ? 80 : 15,
    detectedPatterns: Array.from(detectedPatterns),
    strings,
    functions,
    dependencies,
    networkEvents,
    securityFindings,
    metrics,
  };
}
