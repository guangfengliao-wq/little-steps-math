export type Operation = '+' | '-'
export const ROUND_SIZE = 10
export type Mode = 'mixed' | Operation
export type PracticeType = 'combined' | 'basic' | 'fill' | 'decompose'
export type Blank = 'a' | 'b' | 'result'
export type Question = { a: number; b: number; op: Operation; blank?: Blank; kind?: 'decompose' }
export const result = (q: Question) => q.op === '+' ? q.a + q.b : q.a - q.b
export const answer = (q: Question) => q.blank === 'a' ? q.a : q.blank === 'b' ? q.b : result(q)
export const key = (q: Question) => `${q.kind === 'decompose' ? 'decompose:' : ''}${q.a}${q.op}${q.b}:${q.blank ?? 'result'}`
export function equationParts(q: Question): Array<number | '?'> {
  return [q.blank === 'a' ? '?' : q.a, q.blank === 'b' ? '?' : q.b, !q.blank || q.blank === 'result' ? '?' : result(q)]
}
export function equationText(q: Question) {
  if (q.kind === 'decompose') return `${result(q)} 可以分成 ${q.blank === 'a' ? '?' : q.a} 和 ${q.blank === 'a' ? q.b : '?'}`
  const [a, b, r] = equationParts(q)
  return `${a} ${q.op === '+' ? '+' : '−'} ${b} = ${r}`
}
export function spokenQuestion(q: Question) {
  if (q.kind === 'decompose') return `${result(q)}可以分成${q.blank === 'a' ? '几' : q.a}和${q.blank === 'a' ? q.b : '几'}？`
  const [a, b, r] = equationParts(q).map(n => n === '?' ? '几' : String(n))
  return `${a}${q.op === '+' ? '加' : '减'}${b}，等于${r}？`
}
export function hintDescription(q: Question, unit = '个'): string {
  if (q.kind === 'decompose') return `一共 ${result(q)} ${unit}，分出 ${q.blank === 'a' ? q.b : q.a} ${unit}，另一份有几${unit}？`
  if (q.op === '+') {
    if (q.blank === 'a') return `一共 ${result(q)} ${unit}，右边 ${q.b} ${unit}，左边有几${unit}？`
    if (q.blank === 'b') return `一共 ${result(q)} ${unit}，左边 ${q.a} ${unit}，右边有几${unit}？`
    return `${q.a} ${unit} + ${q.b} ${unit}，合起来有几${unit}？`
  }
  if (q.blank === 'a') return `拿走 ${q.b} ${unit}，剩下 ${result(q)} ${unit}，原来有几${unit}？`
  if (q.blank === 'b') return `原来 ${q.a} ${unit}，剩下 ${result(q)} ${unit}，拿走几${unit}？`
  return `原来 ${q.a} ${unit}，拿走 ${q.b} ${unit}，还剩几${unit}？`
}
export function countInstruction(q: Question, name = '橘子'): string {
  if (q.op === '+') return q.blank === 'a' ? `点左边的${name}，数一数` : q.blank === 'b' ? `点右边的${name}，数一数` : '两边一起数'
  return q.blank === 'a' ? '全部都要数，包括划掉的' : q.blank === 'b' ? `只数划掉的${name}` : `只数没划掉的${name}`
}
// IDs follow the original picture: a objects, then b more for addition.
export function canCountFruit(q: Question, id: number): boolean {
  const total = q.op === '+' ? result(q) : q.a
  if (!Number.isInteger(id) || id < 1 || id > total) return false
  if (q.op === '+') return q.blank === 'a' ? id <= q.a : q.blank === 'b' ? id > q.a : true
  return q.blank === 'a' ? true : q.blank === 'b' ? id > result(q) : id <= result(q)
}
export function learningExample(limit: number): Question {
  return limit === 20 ? { a: 12, b: 6, op: '+' } : limit === 10 ? { a: 6, b: 3, op: '+' } : { a: 2, b: 1, op: '+' }
}
export function canResume(session: { limit: number; review: boolean; practiceType?: PracticeType } | null, limit: number, practiceType: PracticeType = 'combined'): boolean {
  return !!session && !session.review && session.limit === limit && (session.practiceType ?? 'combined') === practiceType
}
export function pool(limit: number, mode: Mode): Question[] {
  const result: Question[] = []
  for (let a = 0; a <= limit; a++) for (let b = 0; b <= limit; b++) {
    if (mode !== '-' && a + b <= limit) result.push({ a, b, op: '+' })
    if (mode !== '+' && a >= b) result.push({ a, b, op: '-' })
  }
  return result
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export function questions(limit: number, mode: Mode, count: number, practiceType: PracticeType = 'combined'): Question[] {
  const previousLimit = limit > 10 ? 10 : limit > 5 ? 5 : 0
  if (practiceType === 'decompose') {
    const all = shuffle(pool(limit, '+').filter(q => q.a > 0 && q.b > 0))
    const stageQuestion = all.find(q => result(q) > previousLimit)
    const picked = stageQuestion ? [stageQuestion, ...all.filter(q => q !== stageQuestion)] : all
    return shuffle(picked.slice(0, count).map(q => ({ ...q, blank: Math.random() < .5 ? 'a' as const : 'b' as const, kind: 'decompose' as const })))
  }
  function pick(op: Operation, size: number): Question[] {
    if (size <= 0) return []
    const all = shuffle(pool(limit, op))
    // Each operation includes an example from the newly selected number range.
    const stageQuestion = all.find(q => Math.max(q.a, q.b, answer(q)) > previousLimit)
    const picked = stageQuestion ? [stageQuestion, ...all.filter(q => q !== stageQuestion)].slice(0, size) : all.slice(0, size)
    // Combined rounds mix calculation and missing-number questions.
    const missing = practiceType === 'basic' ? 0 : practiceType === 'fill' ? picked.length : Math.floor(size * .4)
    const positions = shuffle(picked.map((_, index) => index)).slice(0, missing)
    return picked.map((q, index) => {
      const position = positions.indexOf(index)
      return position < 0 ? q : { ...q, blank: position % 2 === 0 ? 'a' as const : 'b' as const }
    })
  }
  if (mode !== 'mixed') return shuffle(pick(mode, count))
  return shuffle([...pick('+', Math.ceil(count / 2)), ...pick('-', Math.floor(count / 2))])
}
