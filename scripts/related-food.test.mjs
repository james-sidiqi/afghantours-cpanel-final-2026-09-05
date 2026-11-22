import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectRelatedFood } from '../src/lib/relatedFood.mjs';

const food = (id, title, data = {}, slug = id.replace(/\.md$/, '')) => ({
  id, slug, data: { title, paired_foods: [], provinces: [], ...data },
});

test('flat URLs and shared categories do not fabricate food relationships', () => {
  const current = food('dishes/kabuli-pulao.md', 'Qabeli Palaw', {}, 'kabuli-pulao');
  const other = [
    food('desserts/herat-baklava.md', 'Herat Baklava', {}, 'herat-baklava'),
    food('dishes/chiken-korma.md', 'Chicken Korma', {}, 'korma-e-herati'),
  ];
  assert.deepEqual(selectRelatedFood(current, other), []);
});

test('explicit pairings work in both directions, without substring guesses', () => {
  const naan = food('dishes/naan.md', 'Naan');
  const rosh = food('dishes/rosh.md', 'Rosh (Rosht)', { paired_foods: ['Naan'] });
  assert.deepEqual(selectRelatedFood(rosh, [rosh, naan]), [naan]);
  assert.deepEqual(selectRelatedFood(naan, [rosh, naan]), [rosh]);
  const ash = food('dishes/ash.md', 'Aush');
  const soup = food('dishes/soup.md', 'Soup', { paired_foods: ['Ash'] });
  assert.deepEqual(selectRelatedFood(soup, [ash, food('dishes/mashawa.md', 'Mashawa')]), [ash]);
});

test('shared provinces create real regional links, while retired aliases remain excluded', () => {
  const current = food('drinks/tea.md', 'Tea', { provinces: ['Herat'], paired_foods: ['Ouzi'] });
  const local = food('dried-fruits/raisins.md', 'Raisins', { provinces: ['Herat'] });
  const retired = food('dishes/ouzi.md', 'Ouzi', { provinces: ['Herat'] }, 'old-ouzi');
  assert.deepEqual(selectRelatedFood(current, [retired, local], {
    '/food-culture/dishes/ouzi/': '/food-culture/#dishes',
  }), [local]);
  assert.deepEqual(selectRelatedFood(current, [retired], {
    '/food-culture/old-ouzi/': '/food-culture/#dishes',
  }), []);
});
