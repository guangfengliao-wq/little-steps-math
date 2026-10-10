<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import Decomposition from './Decomposition.vue'
import { createDigitFlight } from './digitFlight'
import { createFeedbackAudio } from './feedbackAudio'
import { randomCountingIcon } from './countingIcons'
import { answer, result, key, questions, shuffle, learningExample, canResume, ROUND_SIZE, equationParts, equationText, spokenQuestion, hintDescription, countInstruction, canCountFruit, type Question, type Mode, type PracticeType } from './math'
type RecordItem = { date: string; limit: number; total: number; first: number; review: boolean }
type Session = { list: Question[]; index: number; first: number; missed: boolean; solved: boolean; review: boolean; limit: number; practiceType?: PracticeType }
type Saved = { limit: number; mode: Mode; errors: Question[]; records: RecordItem[]; session: Session | null }
const storageKey = 'little-math-garden-v1'
const warning = ref('')
function read(): Saved {
  const defaults: Saved = { limit: 5, mode: 'mixed', errors: [], records: [], session: null }
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaults
    const data = JSON.parse(raw)
    const validQ = (q: Question) => q && Number.isInteger(q.a) && Number.isInteger(q.b) && q.a >= 0 && q.b >= 0 && q.a <= 20 && q.b <= 20 && ['+', '-'].includes(q.op) && (q.blank === undefined || ['a', 'b', 'result'].includes(q.blank)) && (q.kind === undefined || (q.kind === 'decompose' && q.op === '+' && (q.blank === 'a' || q.blank === 'b') && q.a > 0 && q.b > 0)) && result(q) >= 0 && result(q) <= 20
    if (![5, 10, 20].includes(data.limit) || !['mixed', '+', '-'].includes(data.mode) || !Array.isArray(data.errors) || !data.errors.every(validQ) || !Array.isArray(data.records) || !data.records.every((r: RecordItem) => r && typeof r.date === 'string' && [5,10,20].includes(r.limit) && Number.isInteger(r.total) && r.total > 0 && Number.isInteger(r.first) && r.first >= 0 && r.first <= r.total)) throw Error()
    const s = data.session
    if (s && (!Array.isArray(s.list) || !s.list.length || !s.list.every(validQ) || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.list.length || !Number.isInteger(s.first) || s.first < 0 || s.first > s.list.length || ![5,10,20].includes(s.limit) || typeof s.solved !== 'boolean' || typeof s.missed !== 'boolean' || typeof s.review !== 'boolean' || (s.practiceType !== undefined && !['combined', 'basic', 'fill', 'decompose'].includes(s.practiceType)))) data.session = null
    return data
  } catch { warning.value = '暂时无法读取学习记录，本次可以继续学习。'; return defaults }
}
const saved = ref<Saved>(read())
watch(saved, value => { try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch { warning.value = '记录暂时无法保存，请检查设备存储空间。' } }, { deep: true })
const page = ref('home')
const tab = ref('home')
const errorPage = ref(0), recordPage = ref(0)
const errorPages = computed(() => Math.max(1, Math.ceil(saved.value.errors.length / 6)))
const recordPages = computed(() => Math.max(1, Math.ceil(saved.value.records.length / 3)))
const visibleErrors = computed(() => saved.value.errors.slice(errorPage.value * 6, errorPage.value * 6 + 6))
const visibleRecords = computed(() => saved.value.records.slice(recordPage.value * 3, recordPage.value * 3 + 3))
watch(errorPages, n => { errorPage.value = Math.min(errorPage.value, n - 1) })
const session = computed(() => saved.value.session)
const activities: { type: PracticeType; title: string; icon: string; description: string }[] = [
  { type: 'combined', title: '综合练习', icon: '✎', description: '计算题 + 填空题' },
  { type: 'basic', title: '基础练习', icon: '＋', description: '1 + 1 = ?　1 − 1 = ?' },
  { type: 'decompose', title: '分解题', icon: '⋀', description: '把一个数分成两份' },
  { type: 'fill', title: '填空题', icon: '□', description: '? + 1 = 2　2 − ? = 1' },
]
const practiceTitle = computed(() => activities.find(item => item.type === (session.value?.practiceType ?? 'combined'))?.title)
function resumable(type: PracticeType) { return canResume(session.value, saved.value.limit, type) }
const q = computed<Question>(() => session.value?.list[session.value.index] ?? { a: 2, b: 1, op: '+' })
const input = ref('')
const questionSide = ref<HTMLElement | null>(null)
const digitFlight = createDigitFlight()
const feedback = ref('')
const reaction = ref<'correct' | 'wrong' | ''>('')
const reactionId = ref(0)
const confetti = ref<Array<{ x: number; color: string; tx: string; ty: string; rotation: string; size: string; delay: string; round: boolean }>>([])
const feedbackAudio = createFeedbackAudio()
let confettiTimer: ReturnType<typeof setTimeout> | undefined
let advanceTimer: ReturnType<typeof setTimeout> | undefined
let effectsVersion = 0
function clearEffects() {
  digitFlight.clear()
  effectsVersion++; clearTimeout(advanceTimer)
  clearTimeout(confettiTimer); confetti.value = []; reaction.value = ''; feedbackAudio.stop()
}
function showReaction(correct: boolean) {
  clearEffects(); stopSpeech(); reaction.value = correct ? 'correct' : 'wrong'; reactionId.value++
  const audioDone = feedbackAudio.play(correct)
  if (correct) {
    const version = effectsVersion
    advanceTimer = setTimeout(async () => {
      await audioDone
      if (version === effectsVersion && page.value === 'practice' && !parentOpen.value && session.value?.solved) next()
    }, 1300)
  }
  if (!correct || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#9c27b0', '#e91e63', '#00bcd4']
  confetti.value = Array.from({ length: 50 }, () => ({ x: 5 + Math.random() * 90, color: colors[Math.floor(Math.random() * colors.length)], tx: `${(Math.random() - .5) * 280}px`, ty: `${-(60 + Math.random() * 160)}px`, rotation: `${Math.random() * 720 - 360}deg`, size: `${6 + Math.random() * 7}px`, delay: `${Math.random() * .25}s`, round: Math.random() > .45 }))
  confettiTimer = setTimeout(() => { confetti.value = [] }, 1300)
}
function editAnswer(value: string, keepFlight = false) {
  if (!keepFlight) digitFlight.clear()
  if (session.value?.solved) return
  if (reaction.value === 'wrong') { clearEffects(); feedback.value = ''; input.value = '' }
  input.value = value
}
onBeforeUnmount(() => { clearEffects(); feedbackAudio.dispose(); digitFlight.dispose(); stopSpeech() })
const hint = ref(false)
const counted = ref<number[]>([])
const countingIcon = ref(randomCountingIcon())
const demoA = ref(2), demoB = ref(1), demoOp = ref<'+' | '-'>('+'), demoShow = ref(false)
const demo = computed(() => ({ a: demoA.value, b: demoB.value, op: demoOp.value }))
const visual = computed<Question>(() => page.value === 'learn' ? demo.value : q.value)
const displayedQuestion = computed(() => page.value === 'learn' ? demo.value : q.value)
const parts = computed(() => equationParts(displayedQuestion.value))
const filledAnswer = computed(() => page.value === 'learn' ? demoShow.value ? answer(demo.value) : '?' : session.value?.solved ? answer(q.value) : input.value || '?')
const lastResult = ref<RecordItem | null>(null)
const parentOpen = ref(false)
watch(parentOpen, open => {
  if (open) clearEffects()
  else if (page.value === 'practice' && session.value?.solved) showReaction(true)
})
const today = () => new Date().toLocaleDateString('sv-SE')
const todayCount = computed(() => saved.value.records.filter(r => r.date === today()).reduce((n, r) => n + r.total, 0))
const totalStars = computed(() => saved.value.records.reduce((n, r) => n + r.total, 0))
function navigate(next: string) { clearEffects(); page.value = next; tab.value = next; feedback.value = ''; stopSpeech() }
function start(review = false, practiceType: PracticeType = 'combined') {
  if (review && !saved.value.errors.length) return
  if (saved.value.session && (review || canResume(session.value, saved.value.limit, session.value?.practiceType)) && !window.confirm('开始新一轮会替换尚未完成的练习，确定继续吗？')) return
  const list = review ? shuffle(saved.value.errors).slice(0, ROUND_SIZE) : questions(saved.value.limit, saved.value.mode, ROUND_SIZE, practiceType)
  saved.value.session = { list, index: 0, first: 0, missed: false, solved: false, review, practiceType, limit: review ? Math.max(...list.map(item => Math.max(item.a, item.b, result(item)))) <= 5 ? 5 : Math.max(...list.map(item => Math.max(item.a, item.b, result(item)))) <= 10 ? 10 : 20 : saved.value.limit }
  resetQuestion(); page.value = 'practice'
}
function resume(practiceType: PracticeType) {
  if (!resumable(practiceType)) { start(false, practiceType); return }
  resetQuestion(); page.value = 'practice'
  if (session.value?.solved) showReaction(true)
}
function resetQuestion() { clearEffects(); input.value = ''; feedback.value = ''; hint.value = false; counted.value = []; countingIcon.value = randomCountingIcon(); stopSpeech() }
function submit() {
  const s = session.value
  if (!s || s.solved || input.value === '') return
  if (Number(input.value) === answer(q.value)) {
    s.solved = true
    if (!s.missed) { s.first++; saved.value.errors = saved.value.errors.filter(item => key(item) !== key(q.value)) }
    feedback.value = s.missed ? '这次会啦！' : '答对啦！★'
    showReaction(true)
  } else {
    s.missed = true; hint.value = true; feedback.value = '再数一数，再试一次。'
    showReaction(false)
    if (!saved.value.errors.some(item => key(item) === key(q.value))) saved.value.errors.push({ ...q.value })
  }
}
function next() {
  const s = session.value
  if (!s?.solved) return
  clearEffects()
  if (s.index + 1 < s.list.length) { s.index++; s.missed = false; s.solved = false; resetQuestion() }
  else {
    const record = { date: today(), limit: s.limit, total: s.list.length, first: s.first, review: s.review }
    saved.value.records.unshift(record); lastResult.value = record; saved.value.session = null; page.value = 'result'; stopSpeech()
  }
}
async function digit(n: number, event: MouseEvent) {
  if (session.value?.solved) return
  const current = reaction.value === 'wrong' ? '' : input.value
  if (current.length >= 2) return
  const source = (event.currentTarget as HTMLElement).getBoundingClientRect()
  editAnswer(String(Number(current + n)), true)
  void feedbackAudio.tap(n)
  const token = digitFlight.token()
  await nextTick()
  const target = questionSide.value?.querySelector<HTMLElement>('.equation b, .decomposition-parts b')
  if (target) digitFlight.fly(n, source, target, token)
}
function count(n: number) { if (canCountFruit(visual.value, n) && !counted.value.includes(n)) counted.value.push(n) }
function stopSpeech() { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }
function speak() {
  feedbackAudio.stop()
  if (!('speechSynthesis' in window)) { feedback.value = '这台设备暂不支持朗读，可以一起看图数一数。'; return }
  stopSpeech()
  const item = page.value === 'learn' ? demo.value : q.value
  const utterance = new SpeechSynthesisUtterance(spokenQuestion(item))
  utterance.lang = 'zh-CN'; utterance.rate = .8
  utterance.onerror = () => { feedback.value = '朗读暂时不可用，可以一起看图数一数。' }
  window.speechSynthesis.speak(utterance)
}
function resetDemo() { demoA.value = Math.min(demoA.value, saved.value.limit); if (demoOp.value === '-') demoB.value = Math.min(demoB.value, demoA.value); else demoB.value = Math.min(demoB.value, saved.value.limit - demoA.value); demoShow.value = false; counted.value = []; countingIcon.value = randomCountingIcon() }
watch(() => saved.value.limit, limit => {
  const example = learningExample(limit)
  demoA.value = example.a; demoB.value = example.b; demoOp.value = example.op
  resetDemo(); feedback.value = ''; stopSpeech()
}, { immediate: true })
watch([demoA, demoOp], resetDemo)
watch(demoB, () => { demoShow.value = false; counted.value = []; countingIcon.value = randomCountingIcon() })
</script>

<template>
  <div class="app-shell" :class="`page-${page}`">
    <header><button class="brand" @click="navigate('home')"><span class="brand-icon">✿</span><span>小小数学家</span></button><button class="parent-button" @click="parentOpen = true">⚙ <span>家长设置</span></button></header>
    <p v-if="warning" class="notice" role="status">{{ warning }}</p>
    <template v-if="['home', 'errors', 'records'].includes(page)">
      <nav aria-label="主导航"><button :class="{ active: tab === 'home' }" @click="navigate('home')">⌂ 数学花园</button><button :class="{ active: tab === 'errors' }" @click="navigate('errors')">♡ 再练一练 <span v-if="saved.errors.length" class="badge">{{ saved.errors.length }}</span></button><button :class="{ active: tab === 'records' }" @click="navigate('records')">☆ 成长足迹</button></nav>
    </template>
    <main v-if="page === 'home'" class="home">
      <section class="welcome"><h1>一起学加减！</h1><span>★ {{ totalStars }}</span></section>
      <section class="activities"><button v-for="activity in activities" :key="activity.type" class="activity" :class="`${activity.type}-card`" @click="resume(activity.type)"><span class="activity-icon">{{ activity.icon }}</span><span class="activity-copy"><h2>{{ activity.title }}</h2><p>{{ activity.description }}</p><p>{{ resumable(activity.type) && saved.session ? `继续练习 · 已完成 ${saved.session.index + (saved.session.solved ? 1 : 0)} / ${saved.session.list.length} 题` : `${saved.limit} 以内 · ${ROUND_SIZE} 题` }}</p></span><span class="arrow">→</span></button></section>
      <p class="daily">今日完成 {{ todayCount }} 题</p>
    </main>
    <main v-else-if="page === 'learn' || page === 'practice'" class="lesson">
      <div class="lesson-top"><button class="text-button" @click="navigate('home')">← 返回花园</button><span>{{ page === 'learn' ? `${saved.limit} 以内 · 看图学一学` : `${session?.limit} 以内 · ${session?.review ? '再练一练' : practiceTitle} · 第 ${(session?.index ?? 0) + 1} / ${session?.list.length} 题` }}</span><button class="text-button" @click="speak">♫ 听题目</button></div>
      <div v-if="page === 'practice'" class="progress" aria-label="本轮进度"><i v-for="n in session?.list.length" :key="n" :class="{ done: n <= (session?.index ?? 0) + (session?.solved ? 1 : 0) }"></i></div>
      <section class="lesson-card" :class="page === 'practice' ? reaction : ''"><div class="confetti-layer" aria-hidden="true"><i v-for="(piece, i) in confetti" :key="`${reactionId}-${i}`" class="confetti-piece" :style="{ left: `${piece.x}%`, background: piece.color, width: piece.size, height: piece.size, borderRadius: piece.round ? '50%' : '2px', animationDelay: piece.delay, '--tx': piece.tx, '--ty': piece.ty, '--rot': piece.rotation }"></i></div><div ref="questionSide" class="question-side"><Decomposition v-if="q.kind === 'decompose' && page === 'practice'" :total="result(q)" :known="q.blank === 'a' ? q.b : q.a" :blank-left="q.blank === 'a'" :value="filledAnswer" :state="reaction" /><h1 v-else class="equation"><template v-for="(part, index) in parts" :key="index"><span v-if="index > 0">{{ index === 1 ? displayedQuestion.op === '+' ? '+' : '−' : '=' }}</span><b v-if="part === '?'" :key="reactionId" :class="{ 'box-correct': page === 'practice' && session?.solved, 'box-wrong': page === 'practice' && reaction === 'wrong' }">{{ filledAnswer }}</b><template v-else>{{ part }}</template></template></h1>
        <div v-if="page === 'learn'" class="demo-controls"><label>原来有<select v-model.number="demoA"><option v-for="n in saved.limit + 1" :value="n - 1">{{ n - 1 }}</option></select></label><label>变化<select v-model="demoOp"><option value="+">又来了 ＋</option><option value="-">拿走了 −</option></select></label><label>几个<select v-model.number="demoB"><option v-for="n in (demoOp === '+' ? saved.limit - demoA : demoA) + 1" :value="n - 1">{{ n - 1 }}</option></select></label></div>
        <template v-if="page === 'learn' || hint || session?.solved"><p class="visual-description">{{ hintDescription(visual, countingIcon.unit) }}</p><div class="fruit-board" :class="{ 'decomposition-hint': visual.kind === 'decompose' }"><div class="fruit-group" :class="{ 'missing-group': visual.blank === 'a' }"><button v-for="n in visual.a" :key="n" class="fruit" :class="{ removed: visual.op === '-' && n > visual.a - visual.b, counted: counted.includes(n) }" :disabled="!canCountFruit(visual, n)" :aria-label="`数第 ${n} ${countingIcon.unit}${countingIcon.name}`" @click="count(n)"><span aria-hidden="true">{{ countingIcon.emoji }}</span><small v-if="counted.includes(n)">{{ counted.indexOf(n) + 1 }}</small></button><span v-if="!visual.a" class="zero">0 {{ countingIcon.unit }}</span></div><span v-if="visual.op === '+' && visual.kind !== 'decompose'" class="group-plus">+</span><div v-if="visual.op === '+'" class="fruit-group second" :class="{ 'missing-group': visual.blank === 'b' }"><button v-for="n in visual.b" :key="n" class="fruit" :class="{ counted: counted.includes(visual.a + n) }" :disabled="!canCountFruit(visual, visual.a + n)" :aria-label="`数右边第 ${n} ${countingIcon.unit}${countingIcon.name}`" @click="count(visual.a + n)"><span aria-hidden="true">{{ countingIcon.emoji }}</span><small v-if="counted.includes(visual.a + n)">{{ counted.indexOf(visual.a + n) + 1 }}</small></button><span v-if="!visual.b" class="zero">0 {{ countingIcon.unit }}</span></div></div><p class="count-caption">{{ countInstruction(visual, countingIcon.name) }}<span v-if="counted.length"> · 数了 {{ counted.length }} {{ countingIcon.unit }}</span></p></template>
        <button v-else class="hint-button" @click="hint = true">◉ 看图提示</button>
        <div v-if="page === 'learn'" class="demo-actions"><button class="primary" @click="demoShow = true">看看答案</button><button class="secondary" @click="start()">我来试一试 →</button></div>
      </div><div v-if="page === 'practice'" class="answer-side"><div class="keypad"><button v-for="n in 9" :disabled="session?.solved" @click="digit(n, $event)">{{ n }}</button><button class="erase" :disabled="session?.solved" @click="editAnswer('')">清空</button><button :disabled="session?.solved" @click="digit(0, $event)">0</button><button class="erase" aria-label="删除一位" :disabled="session?.solved" @click="editAnswer(reaction === 'wrong' ? '' : input.slice(0, -1))">⌫</button></div><button v-if="!session?.solved" class="primary submit" :disabled="input === ''" @click="submit">确认 ✓</button><button v-else class="primary submit" disabled>{{ (session?.index ?? 0) + 1 === session?.list.length ? '即将完成 ★' : '即将进入下一题…' }}</button><p class="feedback" :class="{ 'feedback-correct': session?.solved, 'feedback-wrong': reaction === 'wrong' }" aria-live="polite"><span v-if="session?.solved" aria-hidden="true">✓ </span><svg v-else-if="reaction === 'wrong'" :key="reactionId" class="cry-face" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="#ffe082"/><path d="M21 29l10 3m18 0 10-3" stroke="#795548" stroke-width="3" stroke-linecap="round"/><circle cx="27" cy="39" r="3" fill="#795548"/><circle cx="53" cy="39" r="3" fill="#795548"/><path d="M30 58q10-12 20 0" fill="none" stroke="#795548" stroke-width="3" stroke-linecap="round"/><path class="tear" d="M23 43q-9 13 0 13t0-13" fill="#64b5f6"/><path class="tear tear-right" d="M57 43q-9 13 0 13t0-13" fill="#64b5f6"/></svg>{{ feedback || (session?.solved ? '完成啦！' : '') }}</p></div></section>
      <p v-if="page === 'learn' && feedback" class="feedback" role="status">{{ feedback }}</p>
    </main>
    <main v-else-if="page === 'errors'" class="list-page"><h1>再练一练</h1><div v-if="!saved.errors.length" class="empty"><span>🌱</span><h2>还没有需要复习的题目</h2><button class="primary" @click="start()">开始练习 →</button></div><template v-else><div class="error-grid"><div v-for="item in visibleErrors" :key="key(item)"><Decomposition v-if="item.kind === 'decompose'" :total="result(item)" :known="item.blank === 'a' ? item.b : item.a" :blank-left="item.blank === 'a'" value="?" /><template v-else>{{ equationText(item) }}</template></div></div><div class="pager"><button :disabled="errorPage === 0" @click="errorPage--">← 上一页</button><span>{{ errorPage + 1 }} / {{ errorPages }}</span><button :disabled="errorPage + 1 >= errorPages" @click="errorPage++">下一页 →</button></div><button class="primary review-start" @click="start(true)">复习 {{ Math.min(ROUND_SIZE, saved.errors.length) }} 道题 →</button></template></main>
    <main v-else-if="page === 'records'" class="list-page"><h1>我的成长足迹</h1><div class="stats"><div><strong>{{ totalStars }}</strong><span>成长星星</span></div><div><strong>{{ saved.records.length }}</strong><span>完成练习</span></div><div><strong>{{ todayCount }}</strong><span>今日完成题数</span></div></div><div v-if="!saved.records.length" class="empty"><span>☆</span><h2>还没有学习记录</h2><button class="primary" @click="start()">去练一练 →</button></div><div v-for="(record, i) in visibleRecords" :key="i" class="record"><span class="star-token">★</span><div><strong>{{ record.limit }} 以内 · {{ record.review ? '复习' : '加减法练习' }}</strong><p>{{ record.date }} · 完成 {{ record.total }} 题 · 首次答对 {{ record.first }} 题</p></div><b>+{{ record.total }} ☆</b></div><template v-if="saved.records.length"><div class="pager"><button :disabled="recordPage === 0" @click="recordPage--">← 上一页</button><span>{{ recordPage + 1 }} / {{ recordPages }}</span><button :disabled="recordPage + 1 >= recordPages" @click="recordPage++">下一页 →</button></div></template></main>
    <main v-else-if="page === 'result'" class="result"><div class="result-stars">✦ ★ ✦</div><h1>你真棒！</h1><p>完成 {{ lastResult?.total }} 道题，收获 {{ lastResult?.total }} 颗成长星。</p><p>首次答对 {{ lastResult?.first }} 题</p><div><button class="primary" @click="navigate('home')">回到数学花园</button><button class="secondary" @click="navigate('errors')">再练一练</button></div><small>休息一下吧！</small></main>
    <div v-if="parentOpen" class="modal-backdrop" @click.self="parentOpen = false" @keydown.esc="parentOpen = false"><section class="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="section-heading"><h2 id="settings-title">家长设置</h2><button class="text-button" autofocus @click="parentOpen = false">关闭 ✕</button></div><label>学习阶段<select v-model.number="saved.limit"><option :value="5">5 以内 · 小小萌芽</option><option :value="10">10 以内 · 慢慢长大</option><option :value="20">20 以内 · 勇敢探索</option></select></label><label>新一轮练习内容<select v-model="saved.mode"><option value="mixed">加减混合</option><option value="+">只练加法</option><option value="-">只练减法</option></select></label><p class="settings-note">每轮 {{ ROUND_SIZE }} 题，设置下轮生效。记录仅存本机，清除数据后无法恢复。</p><button class="primary" @click="parentOpen = false">设置好了</button></section></div>
  </div>
</template>
