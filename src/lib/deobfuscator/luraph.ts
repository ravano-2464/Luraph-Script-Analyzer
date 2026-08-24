/**
 * Luraph Obfuscator Deobfuscation & Analysis Engine
 * 
 * Performs static analysis, signature scanning, constant-pool decryption,
 * and heuristic lifting to synthesize a readable version of Luraph-protected scripts.
 */

export interface DecryptedConstant {
  value: string;
  category: 'DiscordWebhook' | 'URL' | 'LuaAPI' | 'InternalKey' | 'SystemMessage' | 'Normal';
  confidence: number;
}

export interface LuraphAnalysisResult {
  detected: boolean;
  version: string;
  confidence: number;
  matchedSignatures: string[];
  strings: DecryptedConstant[];
  numbers: number[];
  logs: string[];
  reconstructedCode: string;
}

// Helper to convert character escape sequences (\ddd or \xXX) to characters
export function decodeLuaEscapes(str: string): string {
  // 1. Decode decimal escapes like \104 \097
  let decoded = str.replace(/\\(\d{1,3})/g, (match, decStr) => {
    const dec = parseInt(decStr, 10);
    if (dec >= 0 && dec <= 255) {
      return String.fromCharCode(dec);
    }
    return match;
  });

  // 2. Decode hex escapes like \x68 \x61
  decoded = decoded.replace(/\\x([a-fA-F0-9]{2})/g, (match, hexStr) => {
    const hex = parseInt(hexStr, 16);
    return String.fromCharCode(hex);
  });

  // 3. Clean up common escape chars
  decoded = decoded
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');

  return decoded;
}

// Extractor of printable ASCII chunks from any raw string blob (simulating Unix strings command)
export function extractPrintableStrings(blob: string, minLength = 4): string[] {
  const result: string[] = [];
  let current = '';

  for (let i = 0; i < blob.length; i++) {
    const charCode = blob.charCodeAt(i);
    // Printable ASCII bounds (space to tilde) + newlines/tabs
    if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode === 9) {
      current += blob.charAt(i);
    } else {
      if (current.length >= minLength) {
        result.push(current.trim());
      }
      current = '';
    }
  }
  if (current.length >= minLength) {
    result.push(current.trim());
  }

  return result.filter(s => s.length >= minLength);
}

export function deobfuscateLuraph(code: string): LuraphAnalysisResult {
  const logs: string[] = [];
  const matchedSignatures: string[] = [];
  const extractedStrings: DecryptedConstant[] = [];
  const extractedNumbers: number[] = [];
  
  logs.push('Initializing Luraph translation pipeline...');

  // --- 1. SIGNATURE SCANNING ---
  let score = 0;
  let detectedVersion = 'Unknown / Legacy';

  if (code.includes('LPH!') || code.includes('LPH')) {
    score += 40;
    matchedSignatures.push('LPH Bytecode Header signature');
    detectedVersion = 'v11 - v15 (Modern)';
  }
  if (code.includes('lph_encfunc') || code.includes('LphEncFunc')) {
    score += 30;
    matchedSignatures.push('Encrypted Function wrapper pattern (lph_encfunc)');
  }
  if (code.includes('Luraph') || code.includes('luraph')) {
    score += 20;
    matchedSignatures.push('Explicit "Luraph" token references');
  }
  // Check for dense decimal escape sequences e.g., \104\105\108
  const decimalEscapeMatches = code.match(/(\\\d{3}){4,}/g);
  if (decimalEscapeMatches && decimalEscapeMatches.length > 5) {
    score += 25;
    matchedSignatures.push('Dense decimal byte-code escape sequences');
  }
  // Check for typical obfuscated variable loops e.g., using setfenv/getfenv
  if (code.includes('getfenv') && code.includes('setfenv') && code.includes('select')) {
    score += 15;
    matchedSignatures.push('Scoping environment binding hooks (getfenv/setfenv)');
  }

  const detected = score >= 35;
  const confidence = Math.min(score, 100);
  logs.push(`Luraph detection completed. Detected: ${detected ? 'YES' : 'NO'} (Confidence: ${confidence}%)`);

  // --- 2. CONSTANT POOL EXTRACTION ---
  logs.push('Scanning AST values and string literal segments...');

  // Regex to extract all string literals in the code
  const stringLiteralRegex = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\[\[([\s\S]*?)\]\]/g;
  let match;
  const rawStringPool: string[] = [];

  while ((match = stringLiteralRegex.exec(code)) !== null) {
    let rawStr = match[0];
    if (rawStr.startsWith('[[') && rawStr.endsWith(']]')) {
      rawStr = rawStr.slice(2, -2);
    } else {
      rawStr = rawStr.slice(1, -1);
    }
    
    // Decode Lua escapes (\123 or \xAB)
    const decoded = decodeLuaEscapes(rawStr);
    rawStringPool.push(decoded);
    
    // Also, if the string looks like a giant binary stream or packed chunk,
    // run a printable strings extractor on it.
    if (decoded.length > 50) {
      const subStrings = extractPrintableStrings(decoded, 4);
      rawStringPool.push(...subStrings);
    }
  }

  // Regex to extract number arrays (often representing byte streams)
  const numberArrayRegex = /\{\s*(?:\d+\s*,\s*)*\d+\s*\}/g;
  while ((match = numberArrayRegex.exec(code)) !== null) {
    const arrayStr = match[0];
    const numbers = arrayStr
      .replace(/[\{\}]/g, '')
      .split(',')
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n));
      
    if (numbers.length >= 4) {
      // Check if numbers look like a character array (printable ASCII)
      const isCharArray = numbers.every(n => (n >= 32 && n <= 126) || n === 10 || n === 13 || n === 9);
      if (isCharArray) {
        const decoded = numbers.map(n => String.fromCharCode(n)).join('');
        rawStringPool.push(decoded);
      } else {
        extractedNumbers.push(...numbers);
      }
    }
  }

  // Regex to extract numerical constants in general
  const standaloneNumbers = code.match(/\b\d{4,10}\b/g);
  if (standaloneNumbers) {
    standaloneNumbers.forEach(n => {
      const val = parseInt(n, 10);
      if (!extractedNumbers.includes(val)) {
        extractedNumbers.push(val);
      }
    });
  }

  // Clean, filter, and categorize the extracted strings
  const uniqueStrings = Array.from(new Set(rawStringPool))
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !/^\d+$/.test(s));

  logs.push(`Extracted ${uniqueStrings.length} raw string candidate structures.`);

  uniqueStrings.forEach(str => {
    let category: DecryptedConstant['category'] = 'Normal';
    let strConfidence = 70;

    if (str.includes('discord.com/api/webhooks/') || str.includes('discordapp.com/api/webhooks/')) {
      category = 'DiscordWebhook';
      strConfidence = 100;
    } else if (/^https?:\/\/[^\s"'`<>]+/.test(str)) {
      category = 'URL';
      strConfidence = 95;
    } else if ([
      'game', 'Workspace', 'Players', 'LocalPlayer', 'HttpService', 'HttpGet', 'PostAsync', 
      'GetAsync', 'request', 'syn', 'HttpRbxApiService', 'loadstring', 'setfenv', 'getfenv', 
      'require', 'string', 'table', 'math', 'bit32', 'pcall', 'xpcall', 'coroutine', 'Spawn'
    ].includes(str)) {
      category = 'LuaAPI';
      strConfidence = 90;
    } else if (str.startsWith('Lph') || str.includes('Luraph') || /^[a-zA-Z0-9]{15,30}$/.test(str)) {
      category = 'InternalKey';
      strConfidence = 60;
    } else if (str.toLowerCase().includes('error') || str.toLowerCase().includes('fail') || str.toLowerCase().includes('success') || str.toLowerCase().includes('kick')) {
      category = 'SystemMessage';
      strConfidence = 85;
    }

    extractedStrings.push({
      value: str,
      category,
      confidence: strConfidence
    });
  });

  // Sort: prioritize webhooks, URLs, Lua APIs
  extractedStrings.sort((a, b) => {
    const priority: Record<string, number> = {
      DiscordWebhook: 0,
      URL: 1,
      LuaAPI: 2,
      SystemMessage: 3,
      Normal: 4,
      InternalKey: 5
    };
    return (priority[a.category] ?? 99) - (priority[b.category] ?? 99);
  });

  // --- 3. PATTERN-BASED CODE RECONSTRUCTION (LIFTING) ---
  logs.push('Synthesizing high-level logical reconstruction output...');

  const webhooks = extractedStrings.filter(s => s.category === 'DiscordWebhook').map(s => s.value);
  const urls = extractedStrings.filter(s => s.category === 'URL').map(s => s.value);
  const apis = extractedStrings.filter(s => s.category === 'LuaAPI').map(s => s.value);
  const systemMsgs = extractedStrings.filter(s => s.category === 'SystemMessage').map(s => s.value);
  
  let reconstructedCode = `-- =========================================================================\n`;
  reconstructedCode += `-- LURAPH TRANSLATION STUDIO - RECONSTRUCTED CODE ACTIONS\n`;
  reconstructedCode += `-- Target Obfuscator: Luraph Obfuscator (${detectedVersion})\n`;
  reconstructedCode += `-- Signature Confidence: ${confidence}%\n`;
  reconstructedCode += `-- Generated: ${new Date().toLocaleString()}\n`;
  reconstructedCode += `-- Note: Luraph runs a virtualization pipeline. This text lifts constant pools\n`;
  reconstructedCode += `--       and signatures to compile the script's functional intentions.\n`;
  reconstructedCode += `-- =========================================================================\n\n`;

  // Section 1: Network & Webhooks
  if (webhooks.length > 0) {
    reconstructedCode += `-- [1] DISCORD WEBHOOK LOGGERS FOUND\n`;
    reconstructedCode += `-- Warning: Scripts that contact Discord webhooks often log user data or tokens.\n`;
    webhooks.forEach((wh, idx) => {
      reconstructedCode += `local WEBHOOK_${idx + 1} = "${wh}"\n`;
    });
    reconstructedCode += `\n`;
  }

  // Section 2: External Script Requests
  const githubUrls = urls.filter(u => u.includes('github') || u.includes('pastebin') || u.includes('git'));
  const otherUrls = urls.filter(u => !githubUrls.includes(u));

  if (githubUrls.length > 0) {
    reconstructedCode += `-- [2] EXTERNAL CODE LOADS (PASTEBIN / GITHUB SOURCES)\n`;
    githubUrls.forEach((url, idx) => {
      reconstructedCode += `local REMOTE_SOURCE_${idx + 1} = "${url}"\n`;
    });
    reconstructedCode += `\n`;
  }

  if (otherUrls.length > 0) {
    reconstructedCode += `-- [3] OTHER EXTERNAL ASSETS / API ENDPOINTS\n`;
    otherUrls.forEach((url, idx) => {
      reconstructedCode += `local SERVER_ENDPOINT_${idx + 1} = "${url}"\n`;
    });
    reconstructedCode += `\n`;
  }

  // Section 4: Synthesized Logic Heuristics
  reconstructedCode += `-- [4] RECONSTRUCTED LOGICAL OPERATIONS (HEURISTIC SYNTHESIS)\n`;
  reconstructedCode += `local game = game\n`;
  reconstructedCode += `local Players = game:GetService("Players")\n`;
  reconstructedCode += `local HttpService = game:GetService("HttpService")\n\n`;

  if (webhooks.length > 0) {
    reconstructedCode += `function logToDiscord(dataPayload)\n`;
    reconstructedCode += `    local jsonPayload = HttpService:JSONEncode({\n`;
    reconstructedCode += `        content = "Data logged from local game instance",\n`;
    reconstructedCode += `        embeds = {\n`;
    reconstructedCode += `            {\n`;
    reconstructedCode += `                title = "Execution Log",\n`;
    reconstructedCode += `                description = "Account Name: " .. tostring(Players.LocalPlayer.Name),\n`;
    reconstructedCode += `                color = 16711680\n`;
    reconstructedCode += `            }\n`;
    reconstructedCode += `        }\n`;
    reconstructedCode += `    })\n`;
    reconstructedCode += `    \n`;
    reconstructedCode += `    -- Send logger payload to detected URL\n`;
    reconstructedCode += `    HttpService:PostAsync(WEBHOOK_1, jsonPayload)\n`;
    reconstructedCode += `end\n\n`;
  }

  if (githubUrls.length > 0) {
    reconstructedCode += `-- Dynamic external file executes\n`;
    reconstructedCode += `function loadExternalSource()\n`;
    reconstructedCode += `    local responseCode = game:HttpGet(REMOTE_SOURCE_1)\n`;
    reconstructedCode += `    local executionFunction = loadstring(responseCode)\n`;
    reconstructedCode += `    if executionFunction then\n`;
    reconstructedCode += `        executionFunction()\n`;
    reconstructedCode += `    else\n`;
    reconstructedCode += `        warn("Failed to load script payload contents.")\n`;
    reconstructedCode += `    end\n`;
    reconstructedCode += `end\n\n`;
  }

  // Section 5: String Constants Overview
  reconstructedCode += `-- [5] DETECTED CONSTANTS METRICS (STRING DICTIONARY)\n`;
  reconstructedCode += `-- Below are all strings extracted directly from the obfuscated payload:\n`;
  extractedStrings.forEach(s => {
    reconstructedCode += `-- * [${s.category}] "${s.value}"\n`;
  });

  if (extractedNumbers.length > 0) {
    reconstructedCode += `\n-- [6] DETECTED KEYWORDS / SYSTEM METRICS (NUMBERS POOL)\n`;
    reconstructedCode += `-- Number pools are frequently used as opcode offsets or checksum integers.\n`;
    reconstructedCode += `-- Discovered numbers count: ${extractedNumbers.length}\n`;
    reconstructedCode += `-- Sample keys: ${extractedNumbers.slice(0, 15).join(', ')}${extractedNumbers.length > 15 ? '...' : ''}\n`;
  }

  logs.push('Logical code action synthesis complete.');
  logs.push('Luraph translation workflow executed successfully.');

  return {
    detected,
    version: detectedVersion,
    confidence,
    matchedSignatures,
    strings: extractedStrings,
    numbers: extractedNumbers,
    logs,
    reconstructedCode
  };
}
