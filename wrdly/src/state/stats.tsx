import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/game/theme';

export const STATS_KEY = '@wrdly/stats/v1';
type Stats = { played: number; won: number; lastGameId?: string };
const empty: Stats = { played: 0, won: 0 };
const StatsContext = createContext<{ stats: Stats; recordResult: (id: string, won: boolean) => Promise<void> } | null>(null);

async function readStats(): Promise<Stats> {
  const raw = await AsyncStorage.getItem(STATS_KEY);
  const saved = raw ? JSON.parse(raw) : empty;
  if (!Number.isSafeInteger(saved.played) || !Number.isSafeInteger(saved.won) || saved.won < 0 || saved.played < saved.won) {
    throw new Error('Invalid statistics');
  }
  return saved;
}

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const current = useRef<Stats>(empty);
  const queue = useRef(Promise.resolve());
  const acceptStats = useCallback((saved: Stats) => {
    current.current = saved;
    setStats(saved);
    setError(false);
    setReady(true);
  }, []);
  const load = useCallback(() => readStats().then(acceptStats).catch(() => setError(true)), [acceptStats]);
  useEffect(() => {
    void readStats().then(acceptStats).catch(() => setError(true));
  }, [acceptStats]);

  // Serialize writes and ignore duplicate results (including React effect replays).
  const recordResult = useCallback((id: string, won: boolean) => {
    const write = queue.current.then(async () => {
      if (current.current.lastGameId === id) return;
      const next = { played: current.current.played + 1, won: current.current.won + Number(won), lastGameId: id };
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
      current.current = next;
      setStats(next);
    });
    queue.current = write.catch(() => {});
    return write;
  }, []);

  if (!ready) return (
    <View style={styles.loading}>
      <Text style={styles.brand}>wrdly.</Text>
      {error ? <>
        <Text style={styles.text}>Couldn’t load your saved stats.</Text>
        <Pressable accessibilityRole="button" style={styles.retry} onPress={() => { setError(false); void load(); }}><Text style={styles.text}>Try again</Text></Pressable>
      </> : <ActivityIndicator color={colors.green} accessibilityLabel="Loading statistics" />}
    </View>
  );
  return <StatsContext.Provider value={{ stats, recordResult }}>{children}</StatsContext.Provider>;
}

export function useStats() {
  const value = useContext(StatsContext);
  if (!value) throw new Error('StatsProvider is required');
  return value;
}
const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 20 },
  brand: { color: colors.green, fontSize: 48, fontWeight: '800' },
  text: { color: colors.text, fontSize: 16 },
  retry: { padding: 16, backgroundColor: colors.key, borderRadius: 12 },
});
