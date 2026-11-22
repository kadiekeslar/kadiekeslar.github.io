// Exercise real statistics logic and screen output with storage/hook doubles.
// Native touch/layout and AsyncStorage still need an Expo Go device check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const compile = filename => ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
require.extensions['.ts'] = (module, filename) => module._compile(compile(filename), filename);
const { createStatsStore, STATS_KEY } = require('../src/state/stats-store.ts');
const { newGame, enterKey } = require('../src/game/engine.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(raw = null) {
  let value = raw;
  const storage = {
    fail: false,
    async getItem(key) { assert.equal(key, STATS_KEY); return value; },
    async setItem(key, next) { assert.equal(key, STATS_KEY); if (storage.fail) throw Error('Storage unavailable'); value = next; },
  };
  return { storage, store: createStatsStore(storage, () => {}), saved: () => JSON.parse(value) };
}

async function statsChecks() {
  for (const raw of ['{', 'null', '[]', '', '{"played":5,"won":6}', '{"played":-1,"won":0}', '{"played":1.5,"won":0}']) {
    const f = fixture(raw);
    await f.store.load();
    await tick();
    assert.equal(f.store.snapshot().recovered, true);
    assert.deepEqual(f.saved(), { played: 0, won: 0 });
    await f.store.recordResult('recovered-win', true);
    assert.equal(f.saved().won, 1);
  }
  const corrupt = fixture('{');
  corrupt.storage.fail = true;
  await corrupt.store.load();
  await tick();
  assert.equal(corrupt.store.snapshot().saveState, 'error');
  corrupt.storage.fail = false;
  await corrupt.store.retrySave();
  assert.equal(corrupt.store.snapshot().saveState, 'saved');

  const f = fixture('{"played":10,"won":4,"lastGameId":"previous"}');
  await f.store.load();
  await f.store.recordResult('previous', true);
  assert.equal(f.store.snapshot().stats.played, 10);
  f.storage.fail = true;
  await assert.rejects(f.store.recordResult('win', true));
  // The screen may disappear now; the provider's store still owns this result.
  assert.equal(f.store.snapshot().stats.won, 5);
  await assert.rejects(f.store.recordResult('loss', false));
  await assert.rejects(f.store.recordResult('win', true));
  assert.equal(f.store.snapshot().stats.played, 12);
  f.storage.fail = false;
  await f.store.retrySave();
  await f.store.retrySave();
  assert.deepEqual(f.saved(), { played: 12, won: 5, lastGameId: 'loss' });
  const reload = createStatsStore(f.storage, () => {});
  await reload.load();
  assert.equal(reload.snapshot().stats.won, 5);
  await reload.recordResult('loss', false);
  assert.equal(reload.snapshot().stats.played, 12);
  await Promise.all([f.store.recordResult('next-win', true), f.store.recordResult('next-loss', false), f.store.recordResult('next-win', true)]);
  assert.deepEqual(f.saved(), { played: 14, won: 6, lastGameId: 'next-loss' });

  // New completions during a pending write must not be overwritten by it.
  let release;
  const slow = fixture();
  await slow.store.load();
  const setItem = slow.storage.setItem;
  slow.storage.setItem = async (...args) => { await new Promise(resolve => { release = resolve; }); return setItem(...args); };
  const first = slow.store.recordResult('slow-win', true);
  await tick();
  const second = slow.store.recordResult('during-write', false);
  slow.storage.setItem = setItem;
  release();
  await Promise.all([first, second]);
  assert.deepEqual(slow.saved(), { played: 2, won: 1, lastGameId: 'during-write' });

  const unreadable = fixture();
  unreadable.storage.getItem = async () => { throw Error('Read failure'); };
  await assert.rejects(unreadable.store.load());
  assert.equal(unreadable.store.snapshot().recovered, false);
  unreadable.storage.getItem = async () => '{"played":3,"won":2}';
  await unreadable.store.load();
  assert.equal(unreadable.store.snapshot().stats.played, 3);
}

function screenChecks() {
  let length = '4';
  let slots = [];
  let cursor = 0;
  const useState = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  const react = {
    useState, useEffect: () => {},
    useRef: value => useState(() => ({ current: value }))[0],
    useReducer: (reducer, value, init) => { const [state, set] = useState(() => init(value)); return [state, action => set(old => reducer(old, action))]; },
  };
  const filename = path.resolve(__dirname, '../src/app/game.tsx');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod.require = id => {
    if (id === 'react') return react;
    if (id === 'expo-router') return { useLocalSearchParams: () => ({ length }), router: {} };
    if (id === 'react-native') return {
      Animated: { Value: class { setValue() {} } }, Easing: {}, StyleSheet: { create: value => value },
      View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
    };
    if (id === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (id === '@/state/stats') return { useStats: () => ({ recordResult() {} }), StatsSaveStatus: 'StatsSaveStatus' };
    if (id.startsWith('@/')) return require(path.resolve(__dirname, '../src', id.slice(2)) + '.ts');
    return require(id);
  };
  mod._compile(compile(filename), filename);
  const screen = mod.exports.default;
  const render = (component, props = {}) => { cursor = 0; return component(props); };
  const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  let mountedKey;
  for (const nextLength of ['4', '8', '5', '7', '6', '4']) {
    length = nextLength;
    const selected = screen();
    if (selected.key !== mountedKey) slots = [];
    mountedKey = selected.key;
    const round = render(selected.type, selected.props);
    assert.equal(round.props.answer.length, Number(length));
    assert.equal(round.props.length, Number(length));
    const previous = round.props.answer;
    round.props.onReplay();
    const replay = render(selected.type, selected.props);
    assert.equal(replay.props.answer.length, Number(length));
    assert.notEqual(replay.props.answer, previous);
    const roundSlots = slots;
    slots = [];
    const tree = render(round.type, round.props);
    const keys = walk(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityLabel?.length === 1);
    assert.equal(keys.length, 26);
    assert.equal(new Set(keys.map(node => node.props.accessibilityLabel)).size, 26);
    const i = keys.find(node => node.props.accessibilityLabel === 'I');
    assert.ok(i);
    assert.equal(i.props.style({ pressed: false })[0].minWidth, 0);
    assert.equal(i.props.children.props.style[0].textAlign, 'center');
    i.props.onPress();
    assert.equal(slots[0].current, 'I');
    const afterI = render(round.type, round.props);
    assert.ok(walk(afterI).some(node => node.props?.accessibilityLabel === 'Row 1, letter 1: I'));
    slots = roundSlots;
  }
  // Both outcome types still use the engine's completed-state rules.
  assert.equal([... 'APPLE', 'ENTER'].reduce(enterKey, newGame('APPLE')).status, 'won');
}

(async () => {
  await statsChecks();
  screenChecks();
  console.log('Regression checks passed: corrupt stats recovery, failed-save retry after leaving, cumulative totals, duplicate suppression, serialized writes, reload, route length changes, replay, and keyboard I input.');
})().catch(error => { console.error(error); process.exitCode = 1; });
