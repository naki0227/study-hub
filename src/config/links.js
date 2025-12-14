/**
 * Enludusアプリ間の連携リンク設定
 * ソフト連携用：他アプリへの誘導リンクを管理
 */

export const ENLUDUS_APPS = {
    studyReel: {
        id: 'studyreel',
        name: 'StudyReel',
        description: '勉強風景をタイムラプスで保存し、成果を視覚化',
        url: 'https://apps.apple.com/jp/app/studyreel/id6756177589',
        icon: '📹',
        available: true,
        messages: {
            afterSession: 'タイムラプスで今日の頑張りを振り返ろう！',
            general: '学習風景を美しい動画で記録しませんか？',
        },
    },

    aith: {
        id: 'aith',
        name: 'AITH',
        description: 'あなたの理解度を記憶する、AI個別指導パートナー',
        url: null, // 開発中
        icon: '🤖',
        available: false,
        comingSoon: true,
        messages: {
            afterQuiz: 'AIがあなたの弱点を記憶して、最適な問題を出題します',
            general: '苦手を見逃さないAI家庭教師、まもなく登場！',
        },
    },

    encura: {
        id: 'encura',
        name: 'Encura',
        description: 'あなたの興味に寄り添う、専属パーソナル学芸員AI',
        url: 'https://apps.apple.com/jp/app/encura/id6756042890',
        icon: '🎨',
        available: true,
        messages: {
            general: '美術館でもっと深い体験を',
        },
    },

    vidnitive: {
        id: 'vidnitive',
        name: 'Vidnitive',
        description: 'YouTube動画からAIが教材を自動生成',
        url: 'https://my-language-dojo-l8cl.vercel.app',
        icon: '🎬',
        available: true,
        messages: {
            general: '好きな動画で語学学習を始めよう',
        },
    },

    mirutabi: {
        id: 'mirutabi',
        name: 'Mirutabi',
        description: 'ルート共有と信頼で紡ぐ、旅の体験アーカイブSNS',
        url: 'https://mirutabi.vercel.app',
        icon: '✈️',
        available: true,
        messages: {
            general: '旅の体験を共有しよう',
        },
    },
};

/**
 * おすすめアプリを取得（コンテキストに応じて）
 */
export function getRecommendedApp(context = 'general') {
    switch (context) {
        case 'afterSession':
        case 'afterPomodoro':
            return ENLUDUS_APPS.studyReel;
        case 'afterQuiz':
        case 'weakPoint':
            return ENLUDUS_APPS.aith;
        case 'language':
            return ENLUDUS_APPS.vidnitive;
        default:
            // ランダムに利用可能なアプリを返す
            const availableApps = Object.values(ENLUDUS_APPS).filter(app => app.available);
            return availableApps[Math.floor(Math.random() * availableApps.length)];
    }
}

/**
 * アプリカードのHTMLを生成
 */
export function createAppCard(app, context = 'general') {
    const message = app.messages[context] || app.messages.general;
    const buttonText = app.available ? 'Try App →' : 'Coming Soon';

    return `
    <div class="app-recommendation-card" data-app="${app.id}">
      <span class="app-icon">${app.icon}</span>
      <div class="app-info">
        <h4 class="app-name">${app.name}</h4>
        <p class="app-message">${message}</p>
      </div>
      ${app.available
            ? `<a href="${app.url}" target="_blank" class="app-link">${buttonText}</a>`
            : `<span class="app-coming-soon">${buttonText}</span>`
        }
    </div>
  `;
}
