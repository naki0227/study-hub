/**
 * 暗記カード機能
 * スペースドリピティション（間隔反復）対応
 */

import { DataService } from '../../services/DataService.js';

/**
 * 暗記レベルに応じた次回復習日を計算
 * レベル0: 1日後, レベル1: 3日後, レベル2: 7日後, レベル3: 14日後, レベル4: 30日後
 */
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

export class FlashcardManager {
    constructor() {
        this.cards = DataService.getCards();
    }

    /**
     * カードを追加
     */
    addCard(front, back) {
        const card = DataService.addCard({ front, back });
        this.cards = DataService.getCards();
        return card;
    }

    /**
     * カードを削除
     */
    deleteCard(id) {
        DataService.deleteCard(id);
        this.cards = DataService.getCards();
    }

    /**
     * 全カードを取得
     */
    getAllCards() {
        this.cards = DataService.getCards();
        return this.cards;
    }

    /**
     * 今日復習すべきカードを取得
     */
    getDueCards() {
        const now = new Date();
        return this.cards.filter(card => {
            if (!card.nextReviewAt) return true; // 未学習
            return new Date(card.nextReviewAt) <= now;
        });
    }

    /**
     * カードの回答を記録
     * @param {string} id - カードID
     * @param {boolean} correct - 正解したかどうか
     */
    recordAnswer(id, correct) {
        const card = this.cards.find(c => c.id === id);
        if (!card) return null;

        let newLevel = card.level || 0;

        if (correct) {
            // 正解 → レベルアップ
            newLevel = Math.min(newLevel + 1, REVIEW_INTERVALS.length - 1);
        } else {
            // 不正解 → レベルダウン
            newLevel = Math.max(0, newLevel - 1);
        }

        const daysUntilNext = REVIEW_INTERVALS[newLevel];
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + daysUntilNext);

        const updated = DataService.updateCard(id, {
            level: newLevel,
            lastReviewedAt: new Date().toISOString(),
            nextReviewAt: nextReview.toISOString(),
        });

        // XP付与
        if (correct) {
            DataService.addXP(2);
        }

        this.cards = DataService.getCards();
        return updated;
    }

    /**
     * 学習統計を取得
     */
    getStats() {
        const total = this.cards.length;
        const due = this.getDueCards().length;
        const mastered = this.cards.filter(c => c.level >= 4).length;
        const learning = total - mastered;

        return { total, due, mastered, learning };
    }

    /**
     * ランダムにカードを取得（クイズ用）
     */
    getRandomCards(count = 5) {
        const shuffled = [...this.cards].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }
}

/**
 * 暗記カードUIを生成
 */
export function createFlashcardUI(container, manager) {
    const stats = manager.getStats();
    const dueCards = manager.getDueCards();

    container.innerHTML = `
    <div class="flashcard-section">
      <div class="section-header">
        <h2 class="section-title">📚 暗記カード</h2>
        <button class="btn btn-secondary" id="add-card-btn" style="padding: 8px 16px; font-size: 0.85rem;">+ 追加</button>
      </div>

      <!-- 統計 -->
      <div class="flashcard-stats">
        <div class="stat-mini">
          <span class="stat-value-mini">${stats.total}</span>
          <span class="stat-label-mini">Total</span>
        </div>
        <div class="stat-mini">
          <span class="stat-value-mini">${stats.due}</span>
          <span class="stat-label-mini">Due</span>
        </div>
        <div class="stat-mini">
          <span class="stat-value-mini">${stats.mastered}</span>
          <span class="stat-label-mini">Mastered</span>
        </div>
      </div>

      <!-- 学習ボタン -->
      ${dueCards.length > 0 ? `
        <button class="btn btn-primary" id="start-review-btn" style="width: 100%; margin-top: 16px;">
          🎴 ${dueCards.length}枚のカードを復習
        </button>
      ` : `
        <div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-muted);">
          ${stats.total === 0 ? 'カードを追加して学習を始めよう！' : '今日の復習は完了です 🎉'}
        </div>
      `}

      <!-- カード一覧（折りたたみ） -->
      <details class="card-list-details" style="margin-top: 16px;">
        <summary style="cursor: pointer; color: var(--text-secondary);">カード一覧 (${stats.total})</summary>
        <div class="card-list" style="margin-top: 12px;">
          ${manager.getAllCards().map(card => `
            <div class="card-item" data-id="${card.id}">
              <div class="card-content">
                <div class="card-front">${escapeHtml(card.front)}</div>
                <div class="card-back">${escapeHtml(card.back)}</div>
              </div>
              <div class="card-level">Lv.${card.level || 0}</div>
              <button class="card-delete" data-id="${card.id}">×</button>
            </div>
          `).join('') || '<div style="color: var(--text-muted);">カードがありません</div>'}
        </div>
      </details>
    </div>
  `;

    // イベントリスナー
    const addBtn = container.querySelector('#add-card-btn');
    const reviewBtn = container.querySelector('#start-review-btn');
    const deleteButtons = container.querySelectorAll('.card-delete');

    if (addBtn) {
        addBtn.addEventListener('click', () => showAddCardModal(manager, () => createFlashcardUI(container, manager)));
    }

    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => startReviewSession(manager, () => createFlashcardUI(container, manager)));
    }

    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('このカードを削除しますか？')) {
                manager.deleteCard(id);
                createFlashcardUI(container, manager);
            }
        });
    });
}

/**
 * カード追加モーダル
 */
function showAddCardModal(manager, onUpdate) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
    <div class="modal">
      <h3 class="modal-title">カードを追加</h3>
      <div style="text-align: left;">
        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">表面（問題）</label>
        <input type="text" id="card-front" class="input-field" placeholder="例: apple" style="width: 100%; margin-bottom: 16px;">
        
        <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">裏面（答え）</label>
        <input type="text" id="card-back" class="input-field" placeholder="例: りんご" style="width: 100%;">
      </div>
      <div class="modal-actions" style="margin-top: 24px;">
        <button class="btn btn-primary" id="save-card-btn">保存</button>
        <button class="btn btn-secondary" id="cancel-card-btn">キャンセル</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    const frontInput = modal.querySelector('#card-front');
    const backInput = modal.querySelector('#card-back');
    const saveBtn = modal.querySelector('#save-card-btn');
    const cancelBtn = modal.querySelector('#cancel-card-btn');

    frontInput.focus();

    saveBtn.addEventListener('click', () => {
        const front = frontInput.value.trim();
        const back = backInput.value.trim();

        if (front && back) {
            manager.addCard(front, back);
            modal.remove();
            onUpdate();
        }
    });

    cancelBtn.addEventListener('click', () => modal.remove());

    // Enterキーで保存
    backInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });
}

/**
 * 復習セッション開始
 */
function startReviewSession(manager, onComplete) {
    const dueCards = manager.getDueCards();
    if (dueCards.length === 0) return;

    let currentIndex = 0;
    let isFlipped = false;

    function showCard() {
        const card = dueCards[currentIndex];

        const modal = document.querySelector('.review-modal') || document.createElement('div');
        modal.className = 'modal-overlay active review-modal';
        modal.innerHTML = `
      <div class="modal" style="max-width: 500px;">
        <div style="display: flex; justify-content: space-between; color: var(--text-muted); margin-bottom: 16px;">
          <span>${currentIndex + 1} / ${dueCards.length}</span>
          <span>Lv.${card.level || 0}</span>
        </div>
        
        <div class="review-card ${isFlipped ? 'flipped' : ''}" id="review-card">
          <div class="review-card-content">
            <div class="review-front" style="font-size: 1.5rem; font-weight: 600;">
              ${escapeHtml(card.front)}
            </div>
            ${isFlipped ? `
              <div class="review-back" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--card-border); color: var(--secondary-color); font-size: 1.3rem;">
                ${escapeHtml(card.back)}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 24px;">
          ${!isFlipped ? `
            <button class="btn btn-primary" id="flip-btn" style="width: 100%;">答えを見る</button>
          ` : `
            <button class="btn btn-secondary" id="wrong-btn" style="flex: 1; background: rgba(255,107,107,0.2); border-color: var(--accent-color);">😓 間違えた</button>
            <button class="btn btn-primary" id="correct-btn" style="flex: 1; background: rgba(0,200,83,0.2); border-color: var(--success-color);">✅ 正解！</button>
          `}
        </div>
      </div>
    `;

        if (!document.querySelector('.review-modal')) {
            document.body.appendChild(modal);
        }

        // イベントリスナー
        const flipBtn = modal.querySelector('#flip-btn');
        const wrongBtn = modal.querySelector('#wrong-btn');
        const correctBtn = modal.querySelector('#correct-btn');

        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                isFlipped = true;
                showCard();
            });
        }

        if (wrongBtn) {
            wrongBtn.addEventListener('click', () => {
                manager.recordAnswer(card.id, false);
                nextCard();
            });
        }

        if (correctBtn) {
            correctBtn.addEventListener('click', () => {
                manager.recordAnswer(card.id, true);
                nextCard();
            });
        }
    }

    function nextCard() {
        currentIndex++;
        isFlipped = false;

        if (currentIndex >= dueCards.length) {
            // セッション完了
            const modal = document.querySelector('.review-modal');
            if (modal) modal.remove();

            // 完了メッセージ
            showCompletionMessage(dueCards.length);
            onComplete();
        } else {
            showCard();
        }
    }

    showCard();
}

/**
 * 復習完了メッセージ
 */
function showCompletionMessage(count) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
    <div class="modal">
      <div class="modal-icon">🎉</div>
      <h3 class="modal-title">復習完了！</h3>
      <p class="modal-message">${count}枚のカードを復習しました。お疲れ様です！</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="close-completion">閉じる</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
    modal.querySelector('#close-completion').addEventListener('click', () => modal.remove());
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default FlashcardManager;
