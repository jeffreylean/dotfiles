# ast-grep Cookbook

Use `sg` as structural signal finder before deep reads.

## TS/JS

```bash
sg scan --lang ts --pattern 'export function $NAME($$$) { $$$ }' .
sg scan --lang ts --pattern 'export class $NAME { $$$ }' .
sg scan --lang ts --pattern 'router.$METHOD($PATH, $$$)' .
sg scan --lang ts --pattern 'await Promise.all($$$)' .
sg scan --lang ts --pattern 'try { $$$ } catch ($ERR) { $$$ }' .
```

## Go

```bash
sg scan --lang go --pattern 'func main() { $$$ }' .
sg scan --lang go --pattern 'go func($$$) { $$$ }($$$)' .
sg scan --lang go --pattern 'select { $$$ }' .
sg scan --lang go --pattern 'if err != nil { $$$ }' .
```

## Python

```bash
sg scan --lang python --pattern 'app = FastAPI($$$)' .
sg scan --lang python --pattern '@app.$METHOD($PATH)' .
sg scan --lang python --pattern 'async def $NAME($$$):\n  $$$' .
```

## Pattern clues

```bash
rg -n 'factory|strategy|adapter|middleware|interceptor|observer|publisher|subscriber' .
```
