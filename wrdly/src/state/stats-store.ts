export const STATS_KEY = '@wrdly/stats/v1';
export type Stats = { played: number; won: number; lastGameId?: string };
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
type SaveState = 'saved' | 'saving' | 'error';

// Owned by the provider, so pending totals survive leaving a game screen.
export function createStatsStore(storage: Storage, changed: () => void) {
  let stats: Stats = { played: 0, won: 0 };
  let saveState: SaveState = 'saved';
  let recovered = false;
  let dirty = false;
  let queue = Promise.resolve();
  const recorded = new Set<string>();

  const retrySave = () => {
    const write = queue.then(async () => {
      if (!dirty) return;
      saveState = 'saving';
      changed();
      const snapshot = stats;
      try {
        await storage.setItem(STATS_KEY, JSON.stringify(snapshot));
        // A new result may have arrived while this snapshot was saving.
        if (stats === snapshot) dirty = false;
        saveState = dirty ? 'saving' : 'saved';
      } catch (error) {
        saveState = 'error';
        throw error;
      } finally {
        changed();
      }
    });
    queue = write.catch(() => {});
    return write;
  };

  return {
    snapshot: () => ({ stats, saveState, recovered }),
    async load() {
      // Read errors remain retryable; only malformed data is reset.
      const raw = await storage.getItem(STATS_KEY);
      try {
        const saved = raw === null ? { played: 0, won: 0 } : JSON.parse(raw);
        if (!saved || !Number.isSafeInteger(saved.played) || !Number.isSafeInteger(saved.won)
          || saved.won < 0 || saved.played < saved.won
          || (saved.lastGameId !== undefined && typeof saved.lastGameId !== 'string')) {
          throw new Error('Invalid statistics');
        }
        stats = { played: saved.played, won: saved.won, lastGameId: saved.lastGameId };
        if (stats.lastGameId) recorded.add(stats.lastGameId);
      } catch {
        stats = { played: 0, won: 0 };
        recovered = true;
        dirty = true;
      }
      changed();
      // Repair corrupt storage without making gameplay depend on a write succeeding.
      if (dirty) void retrySave().catch(() => {});
    },
    recordResult(id: string, won: boolean) {
      if (!recorded.has(id)) {
        recorded.add(id);
        stats = { played: stats.played + 1, won: stats.won + Number(won), lastGameId: id };
        dirty = true;
        saveState = 'saving';
        changed();
      }
      return retrySave();
    },
    retrySave,
  };
}
