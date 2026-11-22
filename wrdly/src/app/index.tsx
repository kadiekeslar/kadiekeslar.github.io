import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/game/theme';
import { LENGTHS, type WordLength } from '@/game/words';
import { StatsSaveStatus, useStats } from '@/state/stats';

export default function HomeScreen() {
  const [length, setLength] = useState<WordLength>(5);
  const { stats, saveState, recovered } = useStats();
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>A LITTLE WORD PLAY</Text>
          <Text accessibilityRole="header" style={styles.title}>wrdly<Text style={{ color: colors.green }}>.</Text></Text>
          <Text style={styles.subtitle}>Your word. Your pace.</Text>
          <View style={styles.preview} accessibilityLabel="W R D L Y, sample colored word tiles">
            {'WRDLY'.split('').map((letter, i) => <View key={letter} style={[styles.tile, { backgroundColor: i === 1 ? colors.present : i === 3 ? colors.absent : colors.correct }]}><Text style={styles.tileText}>{letter}</Text></View>)}
          </View>
          <Text style={styles.description}>Six guesses. A fresh word every round.{'\n'}Play a little, or play all day.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>HOW MANY LETTERS?</Text>
          <View style={styles.lengths}>
            {LENGTHS.map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} letter words`} accessibilityState={{ selected: length === n }} onPress={() => setLength(n)} style={({ pressed }) => [styles.option, length === n && styles.selected, pressed && { opacity: 0.7 }]}><Text style={[styles.number, length === n && { color: colors.background }]}>{n}</Text></Pressable>)}
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/game', params: { length } })} style={({ pressed }) => [styles.play, pressed && { opacity: 0.75 }]}><Text style={styles.playText}>Let’s play  →</Text></Pressable>
          <Text style={styles.small}>English words · Unlimited games</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{stats.played}</Text><Text style={styles.statLabel}>PLAYED</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{stats.won}</Text><Text style={styles.statLabel}>WON</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{stats.played ? Math.round(stats.won / stats.played * 100) : 0}%</Text><Text style={styles.statLabel}>WIN RATE</Text></View>
        </View>
        {(saveState !== 'saved' || recovered) && <StatsSaveStatus />}
        <Text style={styles.footer}>A fresh start is always one word away.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 460, alignSelf: 'center', padding: 24, gap: 28, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 12 },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: '700', letterSpacing: 3 },
  title: { color: colors.text, fontSize: 72, fontWeight: '800', letterSpacing: -4 },
  subtitle: { color: colors.text, fontSize: 20, fontWeight: '500' },
  preview: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  tile: { width: 44, height: 48, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  tileText: { color: colors.text, fontSize: 23, fontWeight: '800' },
  description: { color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 20, gap: 16 },
  label: { color: colors.muted, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  lengths: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  selected: { backgroundColor: colors.green, borderColor: colors.green },
  number: { color: colors.text, fontSize: 20, fontWeight: '700' },
  play: { backgroundColor: colors.green, borderRadius: 12, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.background, fontSize: 18, fontWeight: '800' },
  small: { color: colors.muted, textAlign: 'center', fontSize: 12 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 7 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
  divider: { width: 1, height: 32, backgroundColor: colors.border },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
