/* global __dirname:readonly */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Thực thi handler của component, giả lập native player và sự kiện metadata/thời gian.
function controls({ duration = 60, currentTime = 10, playing = true, metadata } = {}) {
  const player = {
    duration, currentTime, playing,
    playCount: 0, pauseCount: 0,
    play() { this.playing = true; this.playCount++; },
    pause() { this.playing = false; this.pauseCount++; },
    seekBy(seconds) { this.currentTime += seconds; },
  };
  const states = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  const element = (type, props) => ({ type, props });
  const dependencies = {
    'react': {
      useState(value) {
        const i = stateIndex++;
        if (!(i in states)) states[i] = value;
        return [states[i], (next) => { states[i] = next; }];
      },
      useRef(value) {
        const i = refIndex++;
        return refs[i] ??= { current: value };
      },
    },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: (styles) => styles } },
    'expo': { useEvent: (_, event) => event === 'sourceLoad' ? metadata : { currentTime: player.currentTime } },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../../components': { AppText: 'AppText' },
    '../../constants/theme': { colors: {}, spacing: { xs: 4 } },
    '../../utils/format': { formatDuration: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` },
  };
  const source = readFileSync(resolve(__dirname, '../src/screens/video/VideoPlaybackControls.tsx'), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  const render = () => {
    stateIndex = 0;
    refIndex = 0;
    const root = module.exports.VideoPlaybackControls({ player });
    const [row, track] = root.props.children;
    const [back, clock, forward] = row.props.children;
    return { track: track.props, back: back.props, forward: forward.props, clock: clock.props.children.join('') };
  };
  return { player, render };
}

test('shows metadata duration even when playback is paused before the first time update', () => {
  const { render } = controls({ duration: 0, currentTime: 0, playing: false, metadata: { duration: 75 } });
  assert.equal(render().clock, '0:00 / 1:15');
});

test('5-second controls clamp to the video boundaries without changing playback state', () => {
  const { player, render } = controls({ currentTime: 2, playing: false });
  render().back.onPress();
  assert.equal(player.currentTime, 0);
  player.currentTime = 59;
  render().forward.onPress();
  assert.equal(player.currentTime, 60);
  assert.equal(player.playCount, 0);
});

test('dragging previews then seeks to the selected second and resumes a playing video', () => {
  const { player, render } = controls();
  const track = render().track;
  track.onLayout({ nativeEvent: { layout: { width: 200 } } });
  track.onResponderGrant({ nativeEvent: { locationX: 100 } });
  assert.equal(player.playing, false);
  assert.equal(player.currentTime, 10);
  track.onResponderMove({ nativeEvent: { locationX: 150 } });
  assert.equal(render().clock, '0:45 / 1:00');
  render().track.onResponderRelease({ nativeEvent: { locationX: 150 } });
  assert.equal(player.currentTime, 45);
  assert.equal(player.playing, true);
});

test('a cancelled drag keeps the position; dragging a paused video keeps it paused', () => {
  const { player, render } = controls({ playing: false });
  const track = render().track;
  track.onLayout({ nativeEvent: { layout: { width: 200 } } });
  track.onResponderGrant({ nativeEvent: { locationX: 100 } });
  track.onResponderTerminate();
  assert.equal(player.currentTime, 10);
  assert.equal(player.playing, false);
  track.onResponderGrant({ nativeEvent: { locationX: 100 } });
  track.onResponderRelease({ nativeEvent: { locationX: 500 } });
  assert.equal(player.currentTime, 60);
  assert.equal(player.playing, false);
});

test('unloaded videos disable seeking and accessibility buttons seek by 5 seconds', () => {
  const unloaded = controls({ duration: 0 });
  assert.equal(unloaded.render().track.onStartShouldSetResponder(), false);
  assert.equal(unloaded.render().back.disabled, true);
  const { player, render } = controls();
  render().track.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
  assert.equal(player.currentTime, 5);
  render().track.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  assert.equal(player.currentTime, 10);
});
