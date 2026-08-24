import { runStaticAnalysis } from 'c:/Users/Admin/Downloads/Lua Breaker/src/lib/analyzer/static-engine';

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
console.log('Result metrics:', result.metrics);
console.log('Functions found:', result.functions);
