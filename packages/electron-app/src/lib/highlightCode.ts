export type TokenKind = 'text' | 'comment' | 'string' | 'keyword' | 'number'

export interface CodeToken {
  key: string
  text: string
  kind: TokenKind
}

export interface CodeLine {
  num: number
  tokens: CodeToken[]
}

const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|return|const|let|var|async|await|try|catch|throw|class|import|from|export|new|def|for|in|if|else|INSERT|INTO|VALUES|ON|CONFLICT|DO|UPDATE|SET)\b|(\b\d+\.?\d*\b)/g

function highlightLine(line: string): CodeToken[] {
  const out: CodeToken[] = []
  let lastIndex = 0
  let key = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(line))) {
    if (m.index > lastIndex) {
      out.push({ key: `k${key++}`, text: line.slice(lastIndex, m.index), kind: 'text' })
    }
    let kind: TokenKind = 'text'
    if (m[1] !== undefined) kind = 'comment'
    else if (m[2] !== undefined) kind = 'string'
    else if (m[3] !== undefined) kind = 'keyword'
    else if (m[4] !== undefined) kind = 'number'
    out.push({ key: `k${key++}`, text: m[0], kind })
    lastIndex = TOKEN_RE.lastIndex
  }
  if (lastIndex < line.length) {
    out.push({ key: `k${key++}`, text: line.slice(lastIndex), kind: 'text' })
  }
  return out
}

export function buildCodeLines(code: string): CodeLine[] {
  return code.split('\n').map((line, i) => {
    const tokens = highlightLine(line)
    if (tokens.length === 0) tokens.push({ key: 'e0', text: ' ', kind: 'text' })
    return { num: i + 1, tokens }
  })
}
