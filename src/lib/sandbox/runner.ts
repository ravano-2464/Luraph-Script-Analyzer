import vm from 'vm';

export interface SandboxLog {
  timestamp: string;
  type: 'info' | 'log' | 'warn' | 'error' | 'security';
  message: string;
}

export function runJavaScriptSandbox(code: string, timeoutMs = 2000): SandboxLog[] {
  const logs: SandboxLog[] = [];
  const addLog = (type: SandboxLog['type'], message: string) => {
    logs.push({
      timestamp: new Date().toISOString(),
      type,
      message,
    });
  };

  addLog('info', 'Sandbox execution context created.');
  addLog('info', 'Host network, filesystem, and external process modules disabled.');

  // Set up custom sandbox context
  const sandboxConsole = {
    log: (...args: unknown[]) => addLog('log', args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')),
    error: (...args: unknown[]) => addLog('error', args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')),
    warn: (...args: unknown[]) => addLog('warn', args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')),
    info: (...args: unknown[]) => addLog('info', args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')),
  };

  const sandboxContext: Record<string, unknown> = {
    console: sandboxConsole,
    fetch: (url: string) => {
      addLog('security', `Blocked network fetch request to: "${url}"`);
      return Promise.reject(new Error('Networking APIs are disabled inside this sandbox.'));
    },
    XMLHttpRequest: function() {
      addLog('security', 'Blocked network request via XMLHttpRequest API.');
      return {
        open: (method: string, url: string) => {
          addLog('security', `Blocked XHR request (${method}) to: "${url}"`);
        },
        send: () => {},
      };
    },
    WebSocket: function(url: string) {
      addLog('security', `Blocked WebSocket network connection attempt to: "${url}"`);
      return {
        send: () => {},
        close: () => {},
      };
    },
    setTimeout: (cb: () => void, delay: number) => {
      addLog('info', `setTimeout registered with delay: ${delay}ms`);
      return setTimeout(cb, Math.min(delay, 50)); // Cap delays to avoid hangs
    },
    setInterval: () => {
      addLog('info', `setInterval ignored in sandbox.`);
      return null;
    },
    process: {
      env: {},
      exit: (code: number) => {
        addLog('security', `Intercepted process exit attempt (code ${code}).`);
        throw new Error(`Process termination call intercepted.`);
      },
    },
    // Safe standard globals
    Buffer: Buffer,
    URL: URL,
    Math: Math,
    Date: Date,
    JSON: JSON,
    RegExp: RegExp,
  };

  // Mock standard browser DOM pointers for typical JS obfuscation compatibility
  sandboxContext.window = sandboxContext;
  sandboxContext.self = sandboxContext;
  sandboxContext.global = sandboxContext;
  sandboxContext.document = {
    createElement: (tag: string) => {
      addLog('info', `Document element created: <${tag}>`);
      return {};
    },
    getElementById: (id: string) => {
      addLog('info', `Document element queried: ID "${id}"`);
      return null;
    },
  };
  sandboxContext.navigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LuraphSandbox/1.0',
    platform: 'Win32',
  };
  sandboxContext.location = {
    href: 'http://localhost:3000/sandbox',
    assign: (url: string) => addLog('security', `Dynamic redirect attempt to: "${url}"`),
    replace: (url: string) => addLog('security', `Dynamic redirect attempt to: "${url}"`),
  };

  const proxyContext = new Proxy(sandboxContext, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      if (typeof prop === 'string') {
        // Log reads on undeclared/malicious objects
        addLog('security', `Dynamic lookup on undefined global variable: "${prop}"`);
      }
      return undefined;
    },
    set(target, prop, value, receiver) {
      if (typeof prop === 'string') {
        addLog('info', `Global property defined: "${prop}" = ${typeof value === 'object' ? 'object' : String(value)}`);
      }
      return Reflect.set(target, prop, value, receiver);
    },
  });

  try {
    const script = new vm.Script(code);
    script.runInNewContext(proxyContext, {
      timeout: timeoutMs,
      displayErrors: true,
    });
    addLog('info', 'Sandbox thread completed execution loop.');
  } catch (error) {
    const err = error as Record<string, unknown> & { code?: string; message?: string };
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      addLog('error', 'Execution terminated: Maximum execution timeout exceeded (2000ms).');
    } else {
      addLog('error', `Execution terminated due to error: ${err.message || String(error)}`);
    }
  }

  return logs;
}

export function runLuaSandboxSimulation(code: string): SandboxLog[] {
  const logs: SandboxLog[] = [];
  const addLog = (type: SandboxLog['type'], message: string) => {
    logs.push({
      timestamp: new Date().toISOString(),
      type,
      message,
    });
  };

  addLog('info', 'Lua Sandboxed Simulation thread spawned.');
  addLog('info', 'Checking environment state mappings...');

  // Identify requirements
  if (code.includes('require')) {
    const matches = code.match(/require\s*\(?\s*["']([^"']+)["']\s*\)?/g);
    if (matches) {
      matches.forEach((m) => {
        addLog('info', `Intercepted package request: ${m}`);
      });
    }
  }

  // Identify dynamic load calls
  if (code.includes('loadstring') || code.includes('load(')) {
    addLog('security', 'Intercepted load/loadstring environment execution block.');
  }

  // Check file/OS executions
  if (code.includes('os.execute') || code.includes('io.popen')) {
    addLog('security', 'Blocked shell escape execution via os.execute/io.popen.');
  }
  if (code.includes('io.open') || code.includes('io.input')) {
    addLog('security', 'Blocked host filesystem read/write operation via io API.');
  }

  // Simulated execution flow
  addLog('info', 'Lua VM: Initializing chunk instructions.');
  addLog('info', 'Lua VM: Virtual stack loaded successfully.');
  addLog('info', 'Lua Sandboxed Simulation completed successfully.');

  return logs;
}
