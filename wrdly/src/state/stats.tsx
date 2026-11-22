import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/game/theme';
import { createStatsStore } from './stats-store';

export { STATS_KEY } from './stats-store';
type Store = ReturnType<typeof createStatsStore>;
const StatsContext = createContext<(ReturnType<Store['snapshot']> & Pick<Store, 'recordResult' | 'retrySave'>) | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [, refresh] = useReducer(n => n + 1, 0);
  const [store] = useState(() => createStatsStore(AsyncStorage, refresh));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    void store.load().then(() => setReady(true)).catch(() => setError(true));
  }, [store]);
  useEffect(load, [load]);

  if (!ready) return (
    <View style={styles.loading}>
      <Text style={styles.brand}>wrdly.</Text>
      {error ? <>
        <Text style={styles.text}>Couldn’t load your saved stats.</Text>
        <Pressable accessibilityRole="button" style={styles.retry} onPress={() => { setError(false); load(); }}><Text style={styles.text}>Try again</Text></Pressable>
      </> : <ActivityIndicator color={colors.green} accessibilityLabel="Loading statistics" />}
    </View>
  );
  return <StatsContext.Provider value={{ ...store.snapshot(), recordResult: store.recordResult, retrySave: store.retrySave }}>{children}</StatsContext.Provider>;
}

export function useStats() {
  const value = useContext(StatsContext);
  if (!value) throw new Error('StatsProvider is required');
  return value;
}
export function StatsSaveStatus() {
  const { saveState, recovered, retrySave } = useStats();
  return <View>
    {recovered && <Text style={styles.notice}>Unreadable saved stats were reset. You can keep playing.</Text>}
    {saveState === 'error'
      ? <Pressable accessibilityRole="button" style={styles.retry} onPress={() => { void retrySave().catch(() => {}); }}><Text style={styles.notice}>Couldn’t save stats. Tap to retry.</Text></Pressable>
      : <Text style={styles.notice}>{saveState === 'saved' ? 'Your stats are saved.' : 'Saving your stats…'}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 20 },
  brand: { color: colors.green, fontSize: 48, fontWeight: '800' },
  text: { color: colors.text, fontSize: 16 },
  notice: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', padding: 12, backgroundColor: colors.key, borderRadius: 12 },
});
