/**
 * DataService - データ永続化レイヤー
 * 
 * 現在: localStorage を使用
 * 将来: Supabase や独自APIに切り替え可能な設計
 */

const STORAGE_KEY = 'studyhub_data';
const DATA_VERSION = 1;

// デフォルトのデータ構造
const defaultData = {
    version: DATA_VERSION,

    // 学習セッション（StudyReelと共有可能）
    sessions: [],

    // 暗記カード（AITHと共有可能）
    cards: [],

    // ゲーミフィケーション（全アプリ共通）
    gamification: {
        xp: 0,
        level: 1,
        badges: [],
        streakDays: 0,
        lastStudyDate: null,
    },

    // 設定
    settings: {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        sessionsBeforeLongBreak: 4,
    },
};

class DataServiceClass {
    constructor() {
        this.data = this.load();
    }

    /**
     * データを読み込む
     */
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // バージョンチェック（将来のマイグレーション用）
                if (parsed.version !== DATA_VERSION) {
                    return this.migrate(parsed);
                }
                return { ...defaultData, ...parsed };
            }
        } catch (e) {
            console.error('DataService: Failed to load data', e);
        }
        return { ...defaultData };
    }

    /**
     * データを保存
     */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('DataService: Failed to save data', e);
            return false;
        }
    }

    /**
     * データマイグレーション（将来のバージョンアップ用）
     */
    migrate(oldData) {
        console.log('DataService: Migrating data from version', oldData.version);
        // 必要に応じてマイグレーションロジックを追加
        return { ...defaultData, ...oldData, version: DATA_VERSION };
    }

    // ========== セッション管理 ==========

    addSession(session) {
        const newSession = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            duration: session.duration || 0,
            type: session.type || 'pomodoro',
            completed: session.completed || true,
        };
        this.data.sessions.push(newSession);
        this.updateStreak();
        this.save();
        return newSession;
    }

    getSessions(limit = 50) {
        return this.data.sessions.slice(-limit);
    }

    getTotalStudyTime() {
        return this.data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    }

    // ========== 暗記カード管理 ==========

    addCard(card) {
        const newCard = {
            id: crypto.randomUUID(),
            front: card.front,
            back: card.back,
            level: 0, // 記憶レベル（AITHと共有時に活用）
            createdAt: new Date().toISOString(),
            lastReviewedAt: null,
            nextReviewAt: null,
        };
        this.data.cards.push(newCard);
        this.save();
        return newCard;
    }

    getCards() {
        return this.data.cards;
    }

    updateCard(id, updates) {
        const index = this.data.cards.findIndex(c => c.id === id);
        if (index !== -1) {
            this.data.cards[index] = { ...this.data.cards[index], ...updates };
            this.save();
            return this.data.cards[index];
        }
        return null;
    }

    deleteCard(id) {
        this.data.cards = this.data.cards.filter(c => c.id !== id);
        this.save();
    }

    // ========== ゲーミフィケーション ==========

    addXP(amount) {
        this.data.gamification.xp += amount;

        // レベルアップチェック（100XPごと）
        const newLevel = Math.floor(this.data.gamification.xp / 100) + 1;
        const leveledUp = newLevel > this.data.gamification.level;
        this.data.gamification.level = newLevel;

        this.save();
        return { xp: this.data.gamification.xp, level: newLevel, leveledUp };
    }

    getGamification() {
        return this.data.gamification;
    }

    addBadge(badgeId) {
        if (!this.data.gamification.badges.includes(badgeId)) {
            this.data.gamification.badges.push(badgeId);
            this.save();
            return true;
        }
        return false;
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastDate = this.data.gamification.lastStudyDate;

        if (lastDate === today) {
            // 今日すでに記録済み
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate === yesterday.toDateString()) {
            // 連続記録更新
            this.data.gamification.streakDays += 1;
        } else if (lastDate !== today) {
            // 連続記録リセット
            this.data.gamification.streakDays = 1;
        }

        this.data.gamification.lastStudyDate = today;
    }

    // ========== 設定 ==========

    getSettings() {
        return this.data.settings;
    }

    updateSettings(updates) {
        this.data.settings = { ...this.data.settings, ...updates };
        this.save();
        return this.data.settings;
    }

    // ========== エクスポート（将来の同期用） ==========

    exportData() {
        return JSON.stringify(this.data);
    }

    importData(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.data = { ...defaultData, ...imported };
            this.save();
            return true;
        } catch (e) {
            console.error('DataService: Failed to import data', e);
            return false;
        }
    }

    // ========== リセット ==========

    reset() {
        this.data = { ...defaultData };
        this.save();
    }
}

// シングルトンとしてエクスポート
export const DataService = new DataServiceClass();
export default DataService;
