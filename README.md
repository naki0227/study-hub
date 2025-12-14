# Study Hub 📚

ポモドーロタイマー × 暗記カード × AIクイズ × ゲーミフィケーションを統合した学習支援Webアプリ。

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black)

## 🌐 Demo

**[https://study-hub-vert.vercel.app/](https://study-hub-vert.vercel.app/)**

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⏱️ **Pomodoro Timer** | 25分集中 / 5分休憩 / 15分長休憩（カスタマイズ可能） |
| 📚 **Flashcards** | 間隔反復アルゴリズム（スペースドリピティション）対応 |
| 🧠 **AI Quiz** | Gemini APIで自動生成、トピックまたはカードから作成 |
| 🏆 **Gamification** | XP、レベルシステム、12種類のバッジ |
| ⚙️ **Settings** | タイマー時間カスタマイズ、データエクスポート/インポート |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env file
echo "VITE_GEMINI_API_KEY=your_api_key_here" > .env

# Start development server
npm run dev
```

## 🔑 API Key

AI Quiz機能には[Google AI Studio](https://aistudio.google.com/apikey)でGemini API Keyを取得してください（無料）。

## 🏗️ Tech Stack

- **Frontend**: Vanilla JavaScript + Vite
- **Styling**: CSS (Enludus Design System)
- **AI**: Google Gemini API
- **Storage**: localStorage (将来的にSupabase移行予定)

## 📁 Project Structure

```
study-hub/
├── src/
│   ├── main.js                    # App orchestration
│   ├── style.css                  # Styling
│   ├── services/
│   │   └── DataService.js         # Data persistence
│   ├── features/
│   │   ├── timer/Timer.js         # Pomodoro logic
│   │   ├── flashcards/Flashcards.js
│   │   ├── quiz/Quiz.js           # AI quiz generation
│   │   └── gamification/Gamification.js
│   └── config/
│       └── links.js               # Enludus app linking
└── index.html
```

## 🔗 Related Projects

This is part of the [Enludus](https://enludus.vercel.app/) ecosystem.

- [StudyReel](https://apps.apple.com/jp/app/studyreel/id6756177589) - タイムラプス学習記録
- [AITH](https://github.com/naki0227/AITH) - AI家庭教師アプリ

## 📄 License

MIT
