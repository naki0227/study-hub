/**
 * ゲーミフィケーションシステム
 * バッジ定義と判定ロジック
 */

import { DataService } from '../../services/DataService.js';

// バッジ定義
export const BADGES = {
    first_session: {
        id: 'first_session',
        name: '初めの一歩',
        description: '初めてのポモドーロを完了',
        icon: '🌱',
        condition: (data) => data.sessions.length >= 1,
    },
    streak_3days: {
        id: 'streak_3days',
        name: '3日連続',
        description: '3日連続で学習',
        icon: '🔥',
        condition: (data) => data.gamification.streakDays >= 3,
    },
    streak_7days: {
        id: 'streak_7days',
        name: '1週間の習慣',
        description: '7日連続で学習',
        icon: '⭐',
        condition: (data) => data.gamification.streakDays >= 7,
    },
    streak_30days: {
        id: 'streak_30days',
        name: '月間マスター',
        description: '30日連続で学習',
        icon: '👑',
        condition: (data) => data.gamification.streakDays >= 30,
    },
    level_5: {
        id: 'level_5',
        name: '駆け出し学者',
        description: 'レベル5に到達',
        icon: '📚',
        condition: (data) => data.gamification.level >= 5,
    },
    level_10: {
        id: 'level_10',
        name: '熟練学者',
        description: 'レベル10に到達',
        icon: '🎓',
        condition: (data) => data.gamification.level >= 10,
    },
    sessions_10: {
        id: 'sessions_10',
        name: '10回達成',
        description: '10回のポモドーロを完了',
        icon: '🎯',
        condition: (data) => data.sessions.length >= 10,
    },
    sessions_50: {
        id: 'sessions_50',
        name: '50回達成',
        description: '50回のポモドーロを完了',
        icon: '🏆',
        condition: (data) => data.sessions.length >= 50,
    },
    sessions_100: {
        id: 'sessions_100',
        name: 'センチュリオン',
        description: '100回のポモドーロを完了',
        icon: '💎',
        condition: (data) => data.sessions.length >= 100,
    },
    cards_10: {
        id: 'cards_10',
        name: 'カードコレクター',
        description: '10枚の暗記カードを作成',
        icon: '🃏',
        condition: (data) => data.cards.length >= 10,
    },
    hour_total: {
        id: 'hour_total',
        name: '1時間達成',
        description: '累計1時間の学習',
        icon: '⏰',
        condition: (data) => {
            const total = data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            return total >= 3600;
        },
    },
    hours_10: {
        id: 'hours_10',
        name: '10時間達成',
        description: '累計10時間の学習',
        icon: '🕐',
        condition: (data) => {
            const total = data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            return total >= 36000;
        },
    },
};

/**
 * 新しく獲得可能なバッジをチェック
 */
export function checkNewBadges() {
    const data = DataService.data;
    const earnedBadges = data.gamification.badges;
    const newBadges = [];

    Object.values(BADGES).forEach(badge => {
        if (!earnedBadges.includes(badge.id) && badge.condition(data)) {
            if (DataService.addBadge(badge.id)) {
                newBadges.push(badge);
            }
        }
    });

    return newBadges;
}

/**
 * 全バッジを取得（獲得状態付き）
 */
export function getAllBadges() {
    const earnedIds = DataService.getGamification().badges;

    return Object.values(BADGES).map(badge => ({
        ...badge,
        earned: earnedIds.includes(badge.id),
    }));
}

/**
 * 獲得済みバッジを取得
 */
export function getEarnedBadges() {
    const earnedIds = DataService.getGamification().badges;
    return earnedIds.map(id => BADGES[id]).filter(Boolean);
}

/**
 * レベル情報を取得
 */
export function getLevelInfo() {
    const { xp, level } = DataService.getGamification();
    const xpForCurrentLevel = (level - 1) * 100;
    const xpForNextLevel = level * 100;
    const xpProgress = xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

    return {
        level,
        xp,
        xpProgress,
        xpNeeded,
        progressPercent: (xpProgress / xpNeeded) * 100,
    };
}

/**
 * 統計情報を取得
 */
export function getStats() {
    const data = DataService.data;
    const totalSeconds = data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
        totalSessions: data.sessions.length,
        totalMinutes: Math.floor(totalSeconds / 60),
        totalHours: (totalSeconds / 3600).toFixed(1),
        streakDays: data.gamification.streakDays,
        totalCards: data.cards.length,
        badgesEarned: data.gamification.badges.length,
        totalBadges: Object.keys(BADGES).length,
    };
}

export default {
    BADGES,
    checkNewBadges,
    getAllBadges,
    getEarnedBadges,
    getLevelInfo,
    getStats,
};
