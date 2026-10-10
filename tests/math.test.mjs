import test from 'node:test'
import assert from 'node:assert/strict'
import { pool, answer, result, key, questions, learningExample, canResume, equationParts, equationText, spokenQuestion, hintDescription, countInstruction, canCountFruit } from '../src/math.ts'

test('基础入口只出计算题，填空入口只出缺少运算数字的题', () => {
  for (const limit of [5, 10, 20]) for (const mode of ['+', '-', 'mixed']) for (const type of ['basic', 'fill']) {
    const round = questions(limit, mode, 10, type)
    assert.equal(round.length, 10)
    assert.equal(new Set(round.map(key)).size, 10)
    for (const q of round) {
      assert.ok(type === 'basic' ? !q.blank : ['a', 'b'].includes(q.blank))
      assert.ok(answer(q) >= 0 && answer(q) <= limit)
      assert.ok(mode === 'mixed' || q.op === mode)
    }
    if (mode === 'mixed') for (const op of ['+', '-']) assert.ok(round.some(q => q.op === op))
  }
})

test('续做匹配练习入口，历史练习归入综合练习', () => {
  for (const type of ['combined', 'basic', 'fill']) for (const selected of ['combined', 'basic', 'fill']) {
    assert.equal(canResume({ limit: 5, review: false, practiceType: type }, 5, selected), type === selected)
  }
  assert.equal(canResume({ limit: 5, review: false }, 5, 'combined'), true)
  assert.equal(canResume({ limit: 5, review: false }, 5, 'basic'), false)
  assert.equal(canResume({ limit: 5, review: false }, 5, 'fill'), false)
})
test('各阶段题目不超范围，减法不产生负数，包含零', () => {
  for (const limit of [5, 10, 20]) for (const mode of ['+', '-', 'mixed']) {
    const all = pool(limit, mode)
    assert.equal(new Set(all.map(key)).size, all.length)
    assert.ok(all.some(q => answer(q) === 0))
    assert.ok(all.some(q => answer(q) === limit))
    for (const q of all) {
      assert.ok(answer(q) >= 0 && answer(q) <= limit)
      assert.ok(q.a >= 0 && q.b >= 0 && q.a <= limit && q.b <= limit)
      assert.ok(mode === 'mixed' || q.op === mode)
    }
  }
})

test('切换阶段或恢复已保存的阶段时，学习示例使用对应范围', () => {
  for (const limit of [5, 10, 20, 10, 5]) {
    const q = learningExample(limit)
    assert.ok(answer(q) <= limit)
    assert.ok(answer(q) > (limit === 20 ? 10 : limit === 10 ? 5 : 0))
  }
})

test('只续做当前阶段的普通练习，旧阶段和错题复习不会误用', () => {
  assert.equal(canResume(null, 10), false)
  for (const limit of [5, 10, 20]) {
    for (const selected of [5, 10, 20]) {
      assert.equal(canResume({ limit, review: false }, selected), limit === selected)
      assert.equal(canResume({ limit, review: true }, selected), false)
    }
  }
})

test('各阶段新一轮包含对应阶段的较大数字，题型、范围和去重正确', () => {
  for (const limit of [5, 10, 20]) for (const mode of ['+', '-', 'mixed']) {
    for (let n = 0; n < 100; n++) {
      const round = questions(limit, mode, 10)
      assert.equal(round.length, 10)
      assert.equal(new Set(round.map(key)).size, 10)
      const previousLimit = limit === 20 ? 10 : limit === 10 ? 5 : 0
      for (const op of mode === 'mixed' ? ['+', '-'] : [mode]) {
        assert.ok(round.some(q => q.op === op && Math.max(q.a, q.b, result(q)) > previousLimit))
      }
      for (const q of round) {
        assert.ok(q.a <= limit && q.b <= limit && answer(q) >= 0 && answer(q) <= limit)
        assert.ok(mode === 'mixed' || q.op === mode)
      }
    }
  }
})

test('四种填空题的答案、显示、朗读及计数目标一致', () => {
  const examples = [
    [{a:4,b:4,op:'+',blank:'a'}, '? + 4 = 8', 4, '几加4，等于8？'],
    [{a:9,b:1,op:'-',blank:'b'}, '9 − ? = 8', 1, '9减几，等于8？'],
    [{a:6,b:4,op:'-',blank:'a'}, '? − 4 = 2', 6, '几减4，等于2？'],
    [{a:2,b:6,op:'+',blank:'b'}, '2 + ? = 8', 6, '2加几，等于8？'],
  ]
  for (const [q, text, expected, speech] of examples) {
    assert.equal(answer(q), expected)
    assert.equal(equationText(q), text)
    assert.equal(spokenQuestion(q), speech)
    assert.equal(Array.from({length: q.op === '+' ? result(q) : q.a}, (_, i) => i + 1).filter(id => canCountFruit(q, id)).length, expected)
  }
  for (const base of pool(20, 'mixed')) for (const blank of ['a','b','result']) {
    const q = {...base, blank}
    const parts = equationParts(q)
    assert.equal(parts.filter(p => p === '?').length, 1)
    const [a,b,r] = parts.map(p => p === '?' ? answer(q) : p)
    assert.equal(q.op === '+' ? a+b : a-b, r)
    assert.equal(Array.from({length: q.op === '+' ? result(q) : q.a}, (_, i) => i + 1).filter(id => canCountFruit(q, id)).length, answer(q))
  }
  const legacy = {a:2,b:3,op:'+'}
  assert.equal(key(legacy), key({...legacy,blank:'result'}))
  assert.notEqual(key(legacy), key({...legacy,blank:'a'}))
})

test('每轮六道计算四道填空，混合模式覆盖四种填空形式', () => {
  for (const limit of [5,10,20]) for (const mode of ['+','-','mixed']) for (let i=0;i<30;i++) {
    const round=questions(limit,mode,10)
    assert.equal(round.filter(q=>!q.blank).length,6)
    assert.equal(round.filter(q=>q.blank==='a').length,2)
    assert.equal(round.filter(q=>q.blank==='b').length,2)
    if(mode==='mixed') for(const op of ['+','-']) for(const blank of ['a','b']) {
      assert.ok(round.some(q=>q.op===op && q.blank===blank))
    }
    for(const q of round) assert.ok(result(q)>=0 && result(q)<=limit && answer(q)>=0 && answer(q)<=limit)
  }
})

test('减法填空保持原题语义，求原数包括已拿走部分，求减数只数拿走部分', () => {
  const original = {a:6,b:5,op:'-',blank:'a'}
  assert.equal(hintDescription(original), '拿走 5 个，剩下 1 个，原来有几个？')
  assert.equal(countInstruction(original), '全部都要数，包括划掉的')
  assert.ok([1,2,3,4,5,6].every(id=>canCountFruit(original,id)))
  const taken = {a:9,b:1,op:'-',blank:'b'}
  assert.equal(hintDescription(taken), '原来 9 个，剩下 8 个，拿走几个？')
  assert.equal(canCountFruit(taken,8), false)
  assert.equal(canCountFruit(taken,9), true)
  assert.equal(canCountFruit(taken,10), false)
  assert.equal(canCountFruit(taken,0), false)
})
test('每轮题目不重复，混合练习同时包含加法和减法', () => {
  for (let n = 0; n < 100; n++) {
    const round = questions(5, 'mixed', 10)
    assert.equal(round.length, 10)
    assert.equal(new Set(round.map(key)).size, 10)
    assert.ok(round.some(q => q.op === '+'))
    assert.ok(round.some(q => q.op === '-'))
  }
})
