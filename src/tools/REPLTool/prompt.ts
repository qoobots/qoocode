// REPLTool prompt
export const DESCRIPTION = 'Execute code in an interactive REPL environment with support for multiple languages'

export const PROMPT = `The REPL tool provides an interactive read-eval-print loop for executing code snippets safely.

## When to Use This Tool:

Use this REPL tool when:
- You need to quickly test a code snippet
- You want to evaluate expressions and see results
- You need to run small code chunks without creating files
- You want to experiment with language features

## Supported Languages:

- JavaScript/TypeScript (default)
- Python
- Bash

## Input Fields:

- **code**: The code to execute
- **language**: The programming language (default: javascript)

## Example Usage:

\`\`\`javascript
// JavaScript example
const result = [1, 2, 3].map(x => x * 2);
console.log(result); // [2, 4, 6]
\`\`\`

## Tips:

- Keep code snippets small and focused
- Use for quick experimentation
- Check results before applying to real files
- Supported in sandbox mode for security`
