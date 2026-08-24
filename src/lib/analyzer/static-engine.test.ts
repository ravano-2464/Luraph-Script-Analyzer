import test from 'node:test';
import assert from 'node:assert';
import { runStaticAnalysis } from './static-engine';

test('JavaScript Static Code Analyzer tests', async (t) => {
  await t.test('should parse simple clean JavaScript and compute metrics', () => {
    const code = `
      const a = 1;
      function greet(name) {
        console.log("Hello, " + name);
      }
      greet("World");
    `;
    const result = runStaticAnalysis(code, 'js');

    assert.strictEqual(result.metrics.loc >= 5, true);
    assert.strictEqual(result.metrics.functionCount, 1);
    assert.strictEqual(result.functions[0].name, 'greet');
    assert.strictEqual(result.functions[0].params.includes('name'), true);
  });

  await t.test('should trigger CRITICAL warning for eval() calls', () => {
    const code = `
      const payload = "console.log('injected')";
      eval(payload);
    `;
    const result = runStaticAnalysis(code, 'js');
    const evals = result.securityFindings.filter(f => f.category === 'Dynamic Execution');

    assert.strictEqual(evals.length, 1);
    assert.strictEqual(evals[0].severity, 'CRITICAL');
  });

  await t.test('should detect network fetch requests', () => {
    const code = `
      fetch('https://api.example.com/data')
        .then(res => res.json())
        .then(console.log);
    `;
    const result = runStaticAnalysis(code, 'js');
    const urlString = result.strings.find(s => s.category === 'URL');
    const netEvent = result.networkEvents.find(n => n.type === 'fetch');

    assert.ok(urlString);
    assert.strictEqual(urlString.value, 'https://api.example.com/data');
    assert.ok(netEvent);
  });
});

test('Lua Static Code Analyzer tests', async (t) => {
  await t.test('should parse simple Lua and compute metrics', () => {
    const code = `
      local val = 42
      function check(x)
        if x > 10 then
          print("large")
        else
          print("small")
        end
      end
      check(val)
    `;
    const result = runStaticAnalysis(code, 'lua');

    assert.strictEqual(result.metrics.loc >= 7, true);
    assert.strictEqual(result.metrics.functionCount, 1);
    assert.strictEqual(result.functions[0].name, 'check');
    assert.strictEqual(result.metrics.branchCount >= 1, true); // at least one if branch
  });

  await t.test('should trigger CRITICAL warning for loadstring() calls', () => {
    const code = `
      local code = "print('hello')"
      loadstring(code)()
    `;
    const result = runStaticAnalysis(code, 'lua');
    const loads = result.securityFindings.filter(f => f.category === 'Dynamic Execution');

    assert.strictEqual(loads.length, 1);
    assert.strictEqual(loads[0].severity, 'CRITICAL');
  });
});
