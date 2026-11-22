import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { enterKey, keyboardMarks, MAX_GUESSES, newGame } from '@/game/engine';
import { colors } from '@/game/theme';
import { chooseWord, LENGTHS, type WordLength } from '@/game/words';
import { useStats } from '@/state/stats';

const rows = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), ['ENTER', ...'ZXCVBNM'.split(''), 'DELETE']];

export default function GameScreen() {
  const params = useLocalSearchParams<{ length?: string }>();
  const parsed = Number(params.length);
  const length = (LENGTHS.includes(parsed as WordLength) ? parsed : 5) as WordLength;
  const [round, setRound] = useState(() => ({ id: 0, answer: chooseWord(length) }));
  return <Round key={`${length}-${round.id}`} length={length} answer={round.answer} onReplay={() => setRound(old => ({ id: old.id + 1, answer: chooseWord(length, old.answer) }))} />;
}

function Round({ length, answer, onReplay }: { length: WordLength; answer: string; onReplay: () => void }) {
  const [game, dispatch] = useReducer(enterKey, answer, newGame);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const inputLocked = useRef(false);
  const [flips] = useState(() => Array.from({ length }, () => new Animated.Value(0)));
  const [keyboardWidth, setKeyboardWidth] = useState(0);
  const [gameId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [board, setBoard] = useState({ width: 320, height: 330 });
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>('saving');
  const [retry, setRetry] = useState(0);
  const { recordResult } = useStats();
  const isRevealing = revealingRow !== null;
  const finished = game.status !== 'playing' && !isRevealing;
  const marks = keyboardMarks(isRevealing ? game.guesses.slice(0, revealingRow) : game.guesses);
  const handleKey = (key: string) => {
    // The ref closes the gap before React renders the disabled keyboard.
    if (inputLocked.current) return;
    const next = enterKey(game, key);
    if (next.guesses.length > game.guesses.length) {
      inputLocked.current = true;
      flips.forEach(flip => flip.setValue(0));
      setRevealingRow(game.guesses.length);
    }
    dispatch(key);
  };

  useEffect(() => {
    if (revealingRow === null) return;
    const animation = Animated.sequence(flips.flatMap(flip => [
      Animated.timing(flip, {
        toValue: 1,
        duration: 460,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(50),
    ]));
    animation.start(({ finished: completed }) => {
      if (!completed) return;
      setRevealingRow(null);
      inputLocked.current = false;
    });
    return () => animation.stop();
  }, [revealingRow, flips]);
  const size = Math.max(24, Math.min(56, Math.floor((board.width - 5 * (length - 1)) / length), Math.floor((board.height - 35) / 6)));
  const goHome = () => router.canGoBack() ? router.back() : router.replace('/');

  useEffect(() => {
    if (game.status === 'playing') return;
    let active = true;
    recordResult(gameId, game.status === 'won').then(
      () => { if (active) setSaveState('saved'); },
      () => { if (active) setSaveState('error'); },
    );
    return () => { active = false; };
  }, [game.status, gameId, recordResult, retry]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go home" onPress={goHome} style={styles.home}><Text style={styles.homeText}>‹ Home</Text></Pressable>
          <Text accessibilityRole="header" style={styles.brand}>wrdly<Text style={{ color: colors.green }}>.</Text></Text>
          <Text style={styles.length}>{length} LETTERS</Text>
        </View>
        <Text style={styles.caption}>{finished ? 'Another word, another fresh start.' : `Find the word · ${MAX_GUESSES - game.guesses.length} guesses left`}</Text>
        <View style={styles.board} onLayout={e => setBoard({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {Array.from({ length: MAX_GUESSES }, (_, row) => {
            const guess = game.guesses[row];
            const current = row === game.guesses.length && !finished && !isRevealing;
            return <View key={row} style={styles.gridRow}>
              {Array.from({ length }, (_, col) => {
                const letter = guess?.word[col] ?? (current ? game.current[col] : '') ?? '';
                const mark = guess?.marks[col];
                const flipping = row === revealingRow;
                const label = `Row ${row + 1}, letter ${col + 1}: ${letter || 'empty'}${mark && !flipping ? `, ${mark === 'correct' ? 'correct position' : mark === 'present' ? 'wrong position' : 'not in word'}` : ''}`;
                const letterText = <Text maxFontSizeMultiplier={1.2} style={[styles.letter, { fontSize: Math.floor(size * 0.5) }]}>{letter}</Text>;
                return <View key={col} accessible accessibilityLabel={label} style={{ width: size, height: size }}>
                  {flipping && mark ? <>
                    <Animated.View style={[styles.tile, styles.tileFace, styles.filled, { transform: [{ perspective: 800 }, { rotateX: flips[col].interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
                      {letterText}
                    </Animated.View>
                    <Animated.View style={[styles.tile, styles.tileFace, { backgroundColor: colors[mark], borderColor: colors[mark], transform: [{ perspective: 800 }, { rotateX: flips[col].interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }] }]}>
                      {letterText}
                    </Animated.View>
                  </> : <View style={[styles.tile, styles.tileFace, letter && !mark ? styles.filled : null, mark && { backgroundColor: colors[mark], borderColor: colors[mark] }]}>
                    {letterText}
                  </View>}
                </View>;
              })}
            </View>;
          })}
        </View>
        {finished ? <View style={styles.result} accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={styles.resultTitle}>{game.status === 'won' ? 'Beautifully done!' : 'That was a tricky one.'}</Text>
          <Text style={styles.resultText}>{game.status === 'won' ? `You found ${answer} in ${game.guesses.length} ${game.guesses.length === 1 ? 'guess' : 'guesses'}.` : `The word was ${answer}.`}</Text>
          {saveState === 'error' ? <Pressable accessibilityRole="button" onPress={() => { setSaveState('saving'); setRetry(n => n + 1); }}><Text style={styles.saveError}>Couldn’t save stats. Tap to retry.</Text></Pressable> : <Text style={styles.saved}>{saveState === 'saved' ? 'Your stats are saved.' : 'Saving your stats…'}</Text>}
          <Pressable accessibilityRole="button" disabled={saveState !== 'saved'} onPress={onReplay} style={[styles.play, saveState !== 'saved' && { opacity: 0.5 }]}><Text style={styles.playText}>Play again  →</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={goHome} style={styles.return}><Text style={styles.homeText}>Back to home</Text></Pressable>
        </View> : <>
          <View style={styles.messageBox}><Text accessibilityLiveRegion="polite" style={styles.message}>{game.message || 'Take your time. You’ve got this.'}</Text></View>
          <View style={styles.keyboard} onLayout={e => setKeyboardWidth(e.nativeEvent.layout.width)}>
            {rows.map((row, i) => {
              const inset = i === 1 ? 14 : 0;
              const totalWeight = row.reduce((total, key) => total + (key.length > 1 ? 1.65 : 1), 0);
              const unitWidth = Math.max(0, keyboardWidth - inset * 2 - 4 * (row.length - 1)) / totalWeight;
              return <View key={i} style={[styles.keyRow, { paddingHorizontal: inset }]}>

              {row.map(key => <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key === 'DELETE' ? 'Delete letter' : key === 'ENTER' ? 'Submit guess' : key}${marks[key] ? `, ${marks[key]}` : ''}`} disabled={isRevealing} accessibilityState={{ disabled: isRevealing }} onPress={() => handleKey(key)} style={({ pressed }) => [styles.key, key.length > 1 && styles.wideKey, keyboardWidth > 0 && { flex: 0, width: unitWidth * (key.length > 1 ? 1.65 : 1) }, marks[key] && { backgroundColor: colors[marks[key]] }, pressed && { opacity: 0.6 }]}>
                <Text maxFontSizeMultiplier={1.2} style={[styles.keyText, key.length > 1 && { fontSize: 10 }]}>{key === 'DELETE' ? '⌫' : key}</Text>
              </Pressable>)}
            </View>;
            })}
          </View>
        </>}
        <View style={styles.legend}>
          {(['correct', 'present', 'absent'] as const).map((mark, i) => <View key={mark} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors[mark] }]} /><Text style={styles.legendText}>{['Right spot', 'Wrong spot', 'Not in word'][i]}</Text></View>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, minHeight: 550, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 58, gap: 8 },
  home: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, minWidth: 76 },
  homeText: { color: colors.green, fontSize: 15, fontWeight: '600' },
  brand: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -1.5 },
  length: { color: colors.muted, fontSize: 10, letterSpacing: 1, minWidth: 76, textAlign: 'right' },
  caption: { color: colors.muted, textAlign: 'center', fontSize: 13, marginBottom: 8 },
  board: { flex: 1, minHeight: 189, justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 12 },
  gridRow: { flexDirection: 'row', gap: 5 },
  tile: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  tileFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backfaceVisibility: 'hidden' },
  filled: { borderColor: colors.muted, backgroundColor: colors.surface },
  letter: { color: colors.text, fontWeight: '800', width: '100%', textAlign: 'center' },
  messageBox: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12 },
  message: { color: colors.muted, textAlign: 'center', fontSize: 12 },
  keyboard: { gap: 7 },
  keyRow: { width: '100%', flexDirection: 'row', gap: 4 },
  key: { flex: 1, minWidth: 0, height: 52, backgroundColor: colors.key, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  wideKey: { flex: 1.65 },
  keyText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, paddingTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  legendText: { color: colors.muted, fontSize: 10 },
  result: { backgroundColor: colors.surface, padding: 16, borderRadius: 16, alignItems: 'center', gap: 8, marginTop: 8 },
  resultTitle: { color: colors.green, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  resultText: { color: colors.text, fontSize: 14, textAlign: 'center' },
  saved: { color: colors.muted, fontSize: 11 },
  saveError: { color: '#F0CD77', fontSize: 13, padding: 8 },
  play: { backgroundColor: colors.green, borderRadius: 10, minHeight: 50, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  playText: { color: colors.background, fontSize: 16, fontWeight: '800' },
  return: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
});
