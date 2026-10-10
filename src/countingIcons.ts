export const iconGroups = [
  { id: 'fruit', label: '水果', items: [
    { emoji: '🍎', name: '苹果', unit: '个' },
    { emoji: '🍊', name: '橘子', unit: '个' },
    { emoji: '🍐', name: '梨', unit: '个' },
    { emoji: '🍑', name: '桃子', unit: '个' },
    { emoji: '🍓', name: '草莓', unit: '颗' },
    { emoji: '🍍', name: '菠萝', unit: '个' },
  ] },
  { id: 'animal', label: '动物', items: [
    { emoji: '🐱', name: '小猫', unit: '只' },
    { emoji: '🐶', name: '小狗', unit: '只' },
    { emoji: '🐰', name: '兔子', unit: '只' },
    { emoji: '🐼', name: '熊猫', unit: '只' },
    { emoji: '🐸', name: '青蛙', unit: '只' },
    { emoji: '🐥', name: '小鸡', unit: '只' },
  ] },
  { id: 'stationery', label: '文具', items: [
    { emoji: '✏️', name: '铅笔', unit: '支' },
    { emoji: '🖍️', name: '蜡笔', unit: '支' },
    { emoji: '📏', name: '直尺', unit: '把' },
    { emoji: '📓', name: '笔记本', unit: '本' },
    { emoji: '🖊️', name: '钢笔', unit: '支' },
    { emoji: '📎', name: '回形针', unit: '枚' },
  ] },
] as const

const countingIcons = iconGroups[0].items.flatMap((_, index) => iconGroups.map(group => group.items[index]!))
export function randomCountingIcon() {
  return countingIcons[Math.floor(Math.random() * countingIcons.length)]!
}
