/**
 * AIクイズ生成機能
 * Gemini APIを使用してカードや入力テキストから問題を自動生成
 */

import { DataService } from '../../services/DataService.js';

// Gemini API設定
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * AIクイズジェネレーター
 */
export class QuizGenerator {
    constructor(apiKey = null) {
        this.apiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || null;
    }

    /**
     * APIキーを設定
     */
    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    /**
     * 保存されたAPIキーを読み込み
     */
    loadApiKey() {
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('gemini_api_key');
        }
        return this.apiKey;
    }

    /**
     * テキストからクイズを生成
     */
    async generateQuizFromText(text, count = 5) {
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません');
        }

        const prompt = `
以下のテキストから${count}問の4択クイズを作成してください。

【テキスト】
${text}

【出力形式】
以下のJSON形式で出力してください：
{
  "questions": [
    {
      "question": "問題文",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "解説"
    }
  ]
}

注意:
- 必ず有効なJSONのみを出力してください
- 4つの選択肢を必ず含めてください
- correctIndexは0-3の数値です
- 日本語で出力してください
`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                throw new Error('Empty response from API');
            }

            // JSONを抽出
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Quiz generation error:', error);
            throw error;
        }
    }

    /**
     * 暗記カードからクイズを生成
     */
    async generateQuizFromCards(cards, count = 5) {
        if (cards.length < 2) {
            throw new Error('クイズを生成するには2枚以上のカードが必要です');
        }

        // カード情報をテキスト化
        const cardText = cards.map(c => `${c.front}: ${c.back}`).join('\n');

        return this.generateQuizFromText(cardText, Math.min(count, cards.length));
    }

    /**
     * トピックからクイズを生成
     */
    async generateQuizFromTopic(topic, difficulty = 'normal', count = 5) {
        if (!this.apiKey) {
            throw new Error('APIキーが設定されていません');
        }

        const difficultyText = {
            easy: '初心者向けの簡単な',
            normal: '一般的な',
            hard: '上級者向けの難しい',
        }[difficulty] || '一般的な';

        const prompt = `
「${topic}」について${difficultyText}4択クイズを${count}問作成してください。

【出力形式】
以下のJSON形式で出力してください：
{
  "questions": [
    {
      "question": "問題文",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "解説"
    }
  ]
}

注意:
- 必ず有効なJSONのみを出力してください
- 4つの選択肢を必ず含めてください
- correctIndexは0-3の数値です
- 日本語で出力してください
- 教育的で興味深い問題を作成してください
`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 2048,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!content) {
                throw new Error('Empty response from API');
            }

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Quiz generation error:', error);
            throw error;
        }
    }
}

/**
 * クイズセッション管理
 */
export class QuizSession {
    constructor(questions) {
        this.questions = questions;
        this.currentIndex = 0;
        this.score = 0;
        this.answers = [];
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    answer(selectedIndex) {
        const question = this.getCurrentQuestion();
        const isCorrect = selectedIndex === question.correctIndex;

        this.answers.push({
            question: question.question,
            selectedIndex,
            correctIndex: question.correctIndex,
            isCorrect,
        });

        if (isCorrect) {
            this.score++;
            DataService.addXP(5);
        }

        return isCorrect;
    }

    next() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            return true;
        }
        return false;
    }

    isComplete() {
        return this.currentIndex >= this.questions.length - 1 &&
            this.answers.length === this.questions.length;
    }

    getResult() {
        return {
            total: this.questions.length,
            correct: this.score,
            percentage: Math.round((this.score / this.questions.length) * 100),
            answers: this.answers,
        };
    }
}

/**
 * クイズUIを生成
 */
export function createQuizUI(container, generator, flashcardManager = null) {
    const hasApiKey = !!generator.loadApiKey();
    const hasCards = flashcardManager && flashcardManager.getAllCards().length >= 2;

    container.innerHTML = `
    <div class="quiz-section">
      <div class="section-header">
        <h2 class="section-title">🧠 AIクイズ</h2>
      </div>

      ${!hasApiKey ? `
        <div class="api-key-setup card" style="padding: 20px;">
          <p style="color: var(--text-secondary); margin-bottom: 12px;">
            AIクイズを使用するには、Gemini APIキーが必要です。
          </p>
          <input type="password" id="api-key-input" class="input-field" 
                 placeholder="Gemini API Key" style="width: 100%; margin-bottom: 12px;">
          <button class="btn btn-primary" id="save-api-key" style="width: 100%;">保存</button>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
            <a href="https://aistudio.google.com/apikey" target="_blank" style="color: var(--secondary-color);">
              Google AI Studio
            </a>で無料で取得できます
          </p>
        </div>
      ` : `
        <div class="quiz-options">
          <!-- トピックからクイズ -->
          <div class="card" style="padding: 16px; margin-bottom: 12px;">
            <h4 style="margin-bottom: 12px;">📝 トピックから生成</h4>
            <input type="text" id="quiz-topic" class="input-field" 
                   placeholder="例: 日本史、英単語、化学..." style="width: 100%; margin-bottom: 12px;">
            <div style="display: flex; gap: 8px;">
              <select id="quiz-difficulty" class="input-field" style="flex: 1;">
                <option value="easy">簡単</option>
                <option value="normal" selected>普通</option>
                <option value="hard">難しい</option>
              </select>
              <select id="quiz-count" class="input-field" style="flex: 1;">
                <option value="3">3問</option>
                <option value="5" selected>5問</option>
                <option value="10">10問</option>
              </select>
            </div>
            <button class="btn btn-primary" id="generate-topic-quiz" style="width: 100%; margin-top: 12px;">
              🎲 クイズを生成
            </button>
          </div>

          ${hasCards ? `
            <!-- カードからクイズ -->
            <div class="card" style="padding: 16px;">
              <h4 style="margin-bottom: 12px;">🎴 暗記カードから生成</h4>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 12px;">
                登録済みのカード(${flashcardManager.getAllCards().length}枚)からクイズを作成
              </p>
              <button class="btn btn-secondary" id="generate-card-quiz" style="width: 100%;">
                カードからクイズ
              </button>
            </div>
          ` : ''}
        </div>
      `}

      <div id="quiz-container"></div>
    </div>
  `;

    // イベントリスナー
    const saveApiKeyBtn = container.querySelector('#save-api-key');
    const topicQuizBtn = container.querySelector('#generate-topic-quiz');
    const cardQuizBtn = container.querySelector('#generate-card-quiz');

    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', () => {
            const input = container.querySelector('#api-key-input');
            const key = input.value.trim();
            if (key) {
                generator.setApiKey(key);
                createQuizUI(container, generator, flashcardManager);
            }
        });
    }

    if (topicQuizBtn) {
        topicQuizBtn.addEventListener('click', async () => {
            const topic = container.querySelector('#quiz-topic').value.trim();
            const difficulty = container.querySelector('#quiz-difficulty').value;
            const count = parseInt(container.querySelector('#quiz-count').value);

            if (!topic) {
                alert('トピックを入力してください');
                return;
            }

            topicQuizBtn.disabled = true;
            topicQuizBtn.textContent = '⏳ 生成中...';

            try {
                const result = await generator.generateQuizFromTopic(topic, difficulty, count);
                startQuizSession(container.querySelector('#quiz-container'), result.questions, () => {
                    createQuizUI(container, generator, flashcardManager);
                });
            } catch (error) {
                alert('クイズの生成に失敗しました: ' + error.message);
                topicQuizBtn.disabled = false;
                topicQuizBtn.textContent = '🎲 クイズを生成';
            }
        });
    }

    if (cardQuizBtn) {
        cardQuizBtn.addEventListener('click', async () => {
            const cards = flashcardManager.getAllCards();

            cardQuizBtn.disabled = true;
            cardQuizBtn.textContent = '⏳ 生成中...';

            try {
                const result = await generator.generateQuizFromCards(cards, 5);
                startQuizSession(container.querySelector('#quiz-container'), result.questions, () => {
                    createQuizUI(container, generator, flashcardManager);
                });
            } catch (error) {
                alert('クイズの生成に失敗しました: ' + error.message);
                cardQuizBtn.disabled = false;
                cardQuizBtn.textContent = 'カードからクイズ';
            }
        });
    }
}

/**
 * クイズセッションを開始
 */
function startQuizSession(container, questions, onComplete) {
    const session = new QuizSession(questions);

    function renderQuestion() {
        const question = session.getCurrentQuestion();
        const progress = ((session.currentIndex) / session.questions.length) * 100;

        container.innerHTML = `
      <div class="quiz-active card" style="padding: 24px; margin-top: 16px;">
        <!-- プログレスバー -->
        <div class="quiz-progress" style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--text-muted);">問題 ${session.currentIndex + 1} / ${session.questions.length}</span>
            <span style="color: var(--secondary-color);">スコア: ${session.score}</span>
          </div>
          <div style="height: 4px; background: var(--card-border); border-radius: 2px;">
            <div style="height: 100%; width: ${progress}%; background: var(--secondary-color); border-radius: 2px; transition: width 0.3s;"></div>
          </div>
        </div>

        <!-- 問題文 -->
        <h3 class="quiz-question" style="font-size: 1.2rem; margin-bottom: 20px; line-height: 1.6;">
          ${escapeHtml(question.question)}
        </h3>

        <!-- 選択肢 -->
        <div class="quiz-options-list">
          ${question.options.map((opt, i) => `
            <button class="quiz-option" data-index="${i}">
              <span class="option-letter">${['A', 'B', 'C', 'D'][i]}</span>
              <span class="option-text">${escapeHtml(opt)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

        // 選択肢クリック
        container.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const isCorrect = session.answer(index);
                showAnswer(container, session, index, isCorrect, () => {
                    if (session.next()) {
                        renderQuestion();
                    } else {
                        showResult(container, session, onComplete);
                    }
                });
            });
        });
    }

    renderQuestion();
}

/**
 * 回答結果を表示
 */
function showAnswer(container, session, selectedIndex, isCorrect, onNext) {
    const question = session.getCurrentQuestion();
    const options = container.querySelectorAll('.quiz-option');

    options.forEach((btn, i) => {
        btn.disabled = true;
        if (i === question.correctIndex) {
            btn.classList.add('correct');
        } else if (i === selectedIndex && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    // 解説表示
    const explanation = document.createElement('div');
    explanation.className = 'quiz-explanation animate-fadeIn';
    explanation.style.cssText = 'margin-top: 20px; padding: 16px; background: var(--card-bg); border-radius: 12px; border-left: 4px solid ' + (isCorrect ? 'var(--success-color)' : 'var(--accent-color)');
    explanation.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="font-size: 1.5rem;">${isCorrect ? '✅' : '❌'}</span>
      <strong>${isCorrect ? '正解！' : '不正解'}</strong>
    </div>
    <p style="color: var(--text-secondary);">${escapeHtml(question.explanation || '解説はありません')}</p>
    <button class="btn btn-primary" id="next-question" style="width: 100%; margin-top: 16px;">
      ${session.currentIndex < session.questions.length - 1 ? '次の問題 →' : '結果を見る'}
    </button>
  `;

    container.querySelector('.quiz-active').appendChild(explanation);

    explanation.querySelector('#next-question').addEventListener('click', onNext);
}

/**
 * 結果を表示
 */
function showResult(container, session, onComplete) {
    const result = session.getResult();

    let message = '';
    let icon = '';

    if (result.percentage >= 80) {
        icon = '🏆';
        message = '素晴らしい！ほぼ完璧です！';
    } else if (result.percentage >= 60) {
        icon = '👏';
        message = 'よくできました！あと少し！';
    } else if (result.percentage >= 40) {
        icon = '💪';
        message = 'もう一度挑戦してみましょう！';
    } else {
        icon = '📚';
        message = '復習が必要かもしれません';
    }

    container.innerHTML = `
    <div class="quiz-result card" style="padding: 32px; margin-top: 16px; text-align: center;">
      <div style="font-size: 4rem; margin-bottom: 16px;">${icon}</div>
      <h3 style="font-size: 1.5rem; margin-bottom: 8px;">クイズ完了！</h3>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">${message}</p>
      
      <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--secondary-color);">
            ${result.correct}/${result.total}
          </div>
          <div style="color: var(--text-muted);">正解数</div>
        </div>
        <div>
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--success-color);">
            ${result.percentage}%
          </div>
          <div style="color: var(--text-muted);">正答率</div>
        </div>
      </div>

      <div style="background: var(--card-bg); padding: 12px; border-radius: 8px; margin-bottom: 24px;">
        <span style="color: var(--warning-color);">+${result.correct * 5} XP</span> 獲得！
      </div>

      <button class="btn btn-primary" id="quiz-done" style="width: 100%;">完了</button>
    </div>
  `;

    container.querySelector('#quiz-done').addEventListener('click', onComplete);
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default QuizGenerator;
