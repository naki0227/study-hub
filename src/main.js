/**
 * Study Hub - メインエントリーポイント
 * ポモドーロタイマー × 暗記カード × AIクイズ × ゲーミフィケーション
 */

import './style.css';
import { Timer } from './features/timer/Timer.js';
import { DataService } from './services/DataService.js';
import { checkNewBadges, getEarnedBadges, getLevelInfo, getStats } from './features/gamification/Gamification.js';
import { getRecommendedApp, createAppCard } from './config/links.js';
import { FlashcardManager, createFlashcardUI } from './features/flashcards/Flashcards.js';
import { QuizGenerator, createQuizUI } from './features/quiz/Quiz.js';

// ========== DOM要素 ==========

const elements = {
  // タイマー
  timerTime: document.getElementById('timer-time'),
  timerModeLabel: document.getElementById('timer-mode-label'),
  timerCircle: document.querySelector('.timer-circle'),
  startBtn: document.getElementById('start-btn'),
  resetBtn: document.getElementById('reset-btn'),
  modeTabs: document.querySelectorAll('.mode-tab'),

  // 統計・バッジ
  levelDisplay: document.getElementById('level-display'),
  statSessions: document.getElementById('stat-sessions'),
  statTime: document.getElementById('stat-time'),
  statStreak: document.getElementById('stat-streak'),
  badgesContainer: document.getElementById('badges-container'),

  // モーダル
  completeModal: document.getElementById('complete-modal'),
  modalIcon: document.getElementById('modal-icon'),
  modalTitle: document.getElementById('modal-title'),
  modalMessage: document.getElementById('modal-message'),
  modalBadgeContainer: document.getElementById('modal-badge-container'),
  modalRecommendation: document.getElementById('modal-recommendation'),
  modalContinue: document.getElementById('modal-continue'),
  appRecommendationSection: document.getElementById('app-recommendation-section'),

  // メインタブ
  mainTabs: document.querySelectorAll('.main-tab'),
  tabTimer: document.getElementById('tab-timer'),
  tabFlashcards: document.getElementById('tab-flashcards'),
  tabQuiz: document.getElementById('tab-quiz'),

  // 暗記カード・クイズ
  flashcardsContainer: document.getElementById('flashcards-container'),
  quizContainerMain: document.getElementById('quiz-container-main'),

  // 設定モーダル
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  settingPomodoro: document.getElementById('setting-pomodoro'),
  settingShortBreak: document.getElementById('setting-short-break'),
  settingLongBreak: document.getElementById('setting-long-break'),
  exportDataBtn: document.getElementById('export-data-btn'),
  importDataBtn: document.getElementById('import-data-btn'),
  importFileInput: document.getElementById('import-file-input'),
  resetDataBtn: document.getElementById('reset-data-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
};

// ========== 状態 ==========

let timer = null;
let isRunning = false;
let flashcardManager = null;
let quizGenerator = null;

// ========== モードラベル ==========

const modeLabels = {
  pomodoro: 'Focus Time',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

// ========== 初期化 ==========

function init() {
  // タイマー作成
  timer = new Timer({
    onTick: handleTick,
    onComplete: handleComplete,
    onModeChange: handleModeChange,
  });

  // 暗記カード・クイズマネージャー作成
  flashcardManager = new FlashcardManager();
  quizGenerator = new QuizGenerator();

  // タイマーイベントリスナー
  elements.startBtn.addEventListener('click', toggleTimer);
  elements.resetBtn.addEventListener('click', resetTimer);
  elements.modalContinue.addEventListener('click', closeModal);

  elements.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      timer.setMode(mode);
      updateModeTabsUI(mode);
    });
  });

  // メインタブ切り替え
  elements.mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchMainTab(targetTab);
    });
  });

  // 初期表示
  updateUI();
  updateStats();
  updateBadges();
  updateLevel();

  // 暗記カード・クイズUIを初期化
  initFlashcardsUI();
  initQuizUI();

  // 設定イベントリスナー
  initSettingsListeners();

  console.log('Study Hub initialized!');
}

// ========== メインタブ切り替え ==========

function switchMainTab(targetTab) {
  // タブボタンの状態更新
  elements.mainTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === targetTab);
  });

  // タブコンテンツの表示切り替え
  elements.tabTimer.classList.toggle('active', targetTab === 'timer');
  elements.tabFlashcards.classList.toggle('active', targetTab === 'flashcards');
  elements.tabQuiz.classList.toggle('active', targetTab === 'quiz');

  // タブ切り替え時にUIを更新
  if (targetTab === 'flashcards') {
    initFlashcardsUI();
  } else if (targetTab === 'quiz') {
    initQuizUI();
  }
}

// ========== 暗記カードUI ==========

function initFlashcardsUI() {
  if (elements.flashcardsContainer) {
    createFlashcardUI(elements.flashcardsContainer, flashcardManager);
  }
}

// ========== クイズUI ==========

function initQuizUI() {
  if (elements.quizContainerMain) {
    createQuizUI(elements.quizContainerMain, quizGenerator, flashcardManager);
  }
}

// ========== タイマー操作 ==========

function toggleTimer() {
  if (isRunning) {
    timer.pause();
    elements.startBtn.textContent = '▶';
    isRunning = false;
  } else {
    timer.start();
    elements.startBtn.textContent = '⏸';
    isRunning = true;
  }
}

function resetTimer() {
  timer.reset();
  elements.startBtn.textContent = '▶';
  isRunning = false;
}

// ========== タイマーコールバック ==========

function handleTick(formattedTime, state) {
  elements.timerTime.textContent = formattedTime;

  // 進捗をCSSカスタムプロパティで更新
  const progress = timer.getProgress();
  elements.timerCircle.style.setProperty('--progress', progress);

  // ページタイトルも更新
  document.title = `${formattedTime} - Study Hub`;
}

function handleComplete(wasPomodoro, state) {
  isRunning = false;
  elements.startBtn.textContent = '▶';

  // 音を鳴らす（オプション）
  playNotificationSound();

  // 新しいバッジをチェック
  const newBadges = checkNewBadges();

  // 統計更新
  updateStats();
  updateBadges();
  updateLevel();

  // モーダル表示
  if (wasPomodoro) {
    showCompleteModal(newBadges);
  }
}

function handleModeChange(mode, state) {
  elements.timerModeLabel.textContent = modeLabels[mode];
  elements.timerCircle.dataset.mode = mode;
  updateModeTabsUI(mode);
}

// ========== UI更新 ==========

function updateUI() {
  const state = timer.getState();
  elements.timerTime.textContent = state.formattedTime;
  elements.timerModeLabel.textContent = modeLabels[state.mode];
  elements.timerCircle.dataset.mode = state.mode;
}

function updateModeTabsUI(activeMode) {
  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === activeMode);
  });
}

function updateStats() {
  const stats = getStats();
  elements.statSessions.textContent = stats.totalSessions;
  elements.statTime.textContent = `${stats.totalHours}h`;
  elements.statStreak.textContent = stats.streakDays;
}

function updateBadges() {
  const earned = getEarnedBadges();

  if (earned.length === 0) {
    elements.badgesContainer.innerHTML = `
      <div class="badge-item locked">
        <span class="badge-icon">🔒</span>
        <span>最初のバッジを獲得しよう</span>
      </div>
    `;
    return;
  }

  elements.badgesContainer.innerHTML = earned.slice(-5).map(badge => `
    <div class="badge-item earned animate-fadeIn">
      <span class="badge-icon">${badge.icon}</span>
      <span>${badge.name}</span>
    </div>
  `).join('');
}

function updateLevel() {
  const levelInfo = getLevelInfo();
  elements.levelDisplay.textContent = levelInfo.level;
}

// ========== モーダル ==========

function showCompleteModal(newBadges = []) {
  const levelInfo = getLevelInfo();

  elements.modalIcon.textContent = '🎉';
  elements.modalTitle.textContent = 'セッション完了！';
  elements.modalMessage.textContent = `+10 XP 獲得！（Lv.${levelInfo.level}）`;

  // 新しいバッジ表示
  if (newBadges.length > 0) {
    elements.modalBadgeContainer.innerHTML = newBadges.map(badge => `
      <div class="badge-item earned" style="margin: 10px 0;">
        <span class="badge-icon">${badge.icon}</span>
        <span><strong>New!</strong> ${badge.name}</span>
      </div>
    `).join('');
  } else {
    elements.modalBadgeContainer.innerHTML = '';
  }

  // アプリ推薦
  const recommendedApp = getRecommendedApp('afterSession');
  elements.modalRecommendation.innerHTML = `
    <div style="margin-top: 16px;">
      ${createAppCard(recommendedApp, 'afterSession')}
    </div>
  `;

  elements.completeModal.classList.add('active');
}

function closeModal() {
  elements.completeModal.classList.remove('active');
}

// ========== 通知音 ==========

function playNotificationSound() {
  try {
    // Web Audio APIで簡単な音を生成
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    // 音声が再生できない環境でもエラーにしない
    console.log('Audio not available');
  }
}

// ========== 設定機能 ==========

function initSettingsListeners() {
  // 設定モーダルを開く
  elements.settingsBtn.addEventListener('click', openSettingsModal);

  // 設定モーダルを閉じる
  elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);

  // 設定を保存
  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  // データエクスポート
  elements.exportDataBtn.addEventListener('click', exportData);

  // データインポート
  elements.importDataBtn.addEventListener('click', () => {
    elements.importFileInput.click();
  });

  elements.importFileInput.addEventListener('change', importData);

  // データリセット
  elements.resetDataBtn.addEventListener('click', resetData);
}

function openSettingsModal() {
  const settings = DataService.getSettings();

  // 現在の設定値をフォームに反映
  elements.settingPomodoro.value = settings.pomodoroMinutes;
  elements.settingShortBreak.value = settings.shortBreakMinutes;
  elements.settingLongBreak.value = settings.longBreakMinutes;

  elements.settingsModal.classList.add('active');
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('active');
}

function saveSettings() {
  const newSettings = {
    pomodoroMinutes: parseInt(elements.settingPomodoro.value) || 25,
    shortBreakMinutes: parseInt(elements.settingShortBreak.value) || 5,
    longBreakMinutes: parseInt(elements.settingLongBreak.value) || 15,
  };

  DataService.updateSettings(newSettings);

  // タイマーを再作成して新しい設定を反映
  timer = new Timer({
    onTick: handleTick,
    onComplete: handleComplete,
    onModeChange: handleModeChange,
  });

  updateUI();
  closeSettingsModal();

  // 成功通知
  alert('設定を保存しました！');
}

function exportData() {
  const data = DataService.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `study-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const success = DataService.importData(e.target.result);
      if (success) {
        // UIを更新
        updateStats();
        updateBadges();
        updateLevel();
        initFlashcardsUI();

        alert('データをインポートしました！');
      } else {
        alert('インポートに失敗しました。ファイル形式を確認してください。');
      }
    } catch (error) {
      alert('インポートに失敗しました: ' + error.message);
    }
  };
  reader.readAsText(file);

  // ファイル入力をリセット
  event.target.value = '';
}

function resetData() {
  if (confirm('本当にすべてのデータをリセットしますか？\n\nこの操作は取り消せません。')) {
    if (confirm('最終確認：セッション履歴、暗記カード、バッジがすべて削除されます。続行しますか？')) {
      DataService.reset();

      // UIを更新
      updateStats();
      updateBadges();
      updateLevel();
      initFlashcardsUI();

      closeSettingsModal();
      alert('データをリセットしました。');
    }
  }
}

// ========== アプリ起動 ==========

document.addEventListener('DOMContentLoaded', init);
