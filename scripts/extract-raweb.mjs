import fs from 'node:fs';
import path from 'node:path';

/** Pulls one snippet out of a RAWeb file. Throws when the anchors moved. */
export function extractSnippet(rawebPath, snippet) {
  const filePath = path.join(rawebPath, snippet.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${snippet.name}: ${snippet.file} no longer exists in RAWeb`);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  if (snippet.grep) {
    const matched = lines.filter((line) => line.includes(snippet.grep));
    if (matched.length === 0) {
      throw new Error(`${snippet.name}: no line matching ${JSON.stringify(snippet.grep)}`);
    }
    return matched.map((line) => line.trim()).join('\n');
  }

  const startAt = lines.findIndex((line) => line.includes(snippet.start));
  if (startAt === -1) {
    throw new Error(`${snippet.name}: start anchor not found: ${JSON.stringify(snippet.start)}`);
  }

  const searchFrom = snippet.end === snippet.start ? startAt : startAt + 1;
  const endOffset = lines.slice(searchFrom).findIndex((line) => line.includes(snippet.end));
  if (endOffset === -1) {
    throw new Error(`${snippet.name}: end anchor not found: ${JSON.stringify(snippet.end)}`);
  }

  const endAt = searchFrom + endOffset + (snippet.extraLines ?? 0);

  return lines.slice(startAt, endAt + 1).join('\n');
}

export function readRawebRef(rawebPath) {
  const headPath = path.join(rawebPath, '.git', 'HEAD');
  if (!fs.existsSync(headPath)) return { commit: 'unknown', date: 'unknown' };

  const head = fs.readFileSync(headPath, 'utf8').trim();
  const ref = head.startsWith('ref: ') ? head.slice(5) : null;
  const commit = ref
    ? fs.readFileSync(path.join(rawebPath, '.git', ref), 'utf8').trim()
    : head;

  return { commit: commit.slice(0, 9) };
}
