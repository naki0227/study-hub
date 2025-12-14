/**
 * ポモドーロタイマー機能
 */

import { DataService } from '../../services/DataService.js';

export class Timer {
    constructor(options = {}) {
        this.settings = DataService.getSettings();

        // タイマー状態
        this.state = {
            mode: 'pomodoro', // 'pomodoro' | 'shortBreak' | 'longBreak'
            timeRemaining: this.settings.pomodoroMinutes * 60,
            isRunning: false,
            completedSessions: 0,
        };

        this.intervalId = null;
        this.callbacks = {
            onTick: options.onTick || (() => { }),
            onComplete: options.onComplete || (() => { }),
            onModeChange: options.onModeChange || (() => { }),
        };
    }

    /**
     * タイマー開始
     */
    start() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.intervalId = setInterval(() => this.tick(), 1000);
    }

    /**
     * タイマー一時停止
     */
    pause() {
        this.state.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * タイマーリセット
     */
    reset() {
        this.pause();
        this.state.timeRemaining = this.getDurationForMode(this.state.mode);
        this.callbacks.onTick(this.getFormattedTime(), this.state);
    }

    /**
     * 毎秒の処理
     */
    tick() {
        if (this.state.timeRemaining > 0) {
            this.state.timeRemaining -= 1;
            this.callbacks.onTick(this.getFormattedTime(), this.state);
        } else {
            this.complete();
        }
    }

    /**
     * セッション完了処理
     */
    complete() {
        this.pause();

        const wasPomodoro = this.state.mode === 'pomodoro';

        if (wasPomodoro) {
            // ポモドーロ完了 → セッション記録
            this.state.completedSessions += 1;

            DataService.addSession({
                duration: this.settings.pomodoroMinutes * 60,
                type: 'pomodoro',
                completed: true,
            });

            // XP付与
            DataService.addXP(10);

            // 次のモード決定
            if (this.state.completedSessions % this.settings.sessionsBeforeLongBreak === 0) {
                this.setMode('longBreak');
            } else {
                this.setMode('shortBreak');
            }
        } else {
            // 休憩完了 → ポモドーロに戻る
            this.setMode('pomodoro');
        }

        this.callbacks.onComplete(wasPomodoro, this.state);
    }

    /**
     * モード切り替え
     */
    setMode(mode) {
        this.pause();
        this.state.mode = mode;
        this.state.timeRemaining = this.getDurationForMode(mode);
        this.callbacks.onModeChange(mode, this.state);
        this.callbacks.onTick(this.getFormattedTime(), this.state);
    }

    /**
     * モードに応じた時間を取得
     */
    getDurationForMode(mode) {
        switch (mode) {
            case 'shortBreak':
                return this.settings.shortBreakMinutes * 60;
            case 'longBreak':
                return this.settings.longBreakMinutes * 60;
            default:
                return this.settings.pomodoroMinutes * 60;
        }
    }

    /**
     * フォーマット済み時間を取得
     */
    getFormattedTime() {
        const minutes = Math.floor(this.state.timeRemaining / 60);
        const seconds = this.state.timeRemaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * 進捗率を取得（0-1）
     */
    getProgress() {
        const total = this.getDurationForMode(this.state.mode);
        return 1 - (this.state.timeRemaining / total);
    }

    /**
     * 状態を取得
     */
    getState() {
        return {
            ...this.state,
            formattedTime: this.getFormattedTime(),
            progress: this.getProgress(),
        };
    }

    /**
     * クリーンアップ
     */
    destroy() {
        this.pause();
    }
}

export default Timer;
