<div align="center">

# 🎧 ChunkEar · 语块听

**从最简单的语义模块开始，逐级自动化，彻底攻克英语听力。**

[![macOS](https://img.shields.io/badge/macOS-✓-brightgreen?logo=apple)](https://github.com/wxin1068-beep/-ChunkEar)
[![Python](https://img.shields.io/badge/Python-3.6+-blue?logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/wxin1068-beep/-ChunkEar/pulls)

> _"不是哑巴英语，是聋子英语。"_
> — 王大爷

</div>

---

## 🌟 核心理念

英语听不懂的根本原因不是词汇量小，而是**耳朵没练出一套对声音信号的自动解码能力**。

ChunkEar 不走传统的"背单词→学语法→做阅读"路线，而是：

```
从最简单的语义模块（语块）入手
  → 听到烂熟（自动化）
  → 再进入下一层难度
  → 不达标、不进阶
```

所谓**语义模块**，就是英语中反复成块出现的短语结构——像 `How are you doing?`、`The thing is...`、`As far as I know...`——它们是语言的预制砖头，大脑不是逐词处理而是整块识别的。

---

## 📚 语料库结构

**250+** 个高频语义模块，分 **6 级**递进：

| 级别 | 名称 | 模块数 | 示例 |
|:---:|------|:------:|------|
| 🟢 **0** | 极简根基 | 50 | `Hello`, `Thank you`, `Of course`, `No way` |
| 🔵 **1** | 日常问候 | 44 | `How are you?`, `Nice to meet you`, `Excuse me` |
| 🔷 **2** | 生活常用 | 61 | `I don't know`, `What's going on`, `Let me see` |
| 🟣 **3** | 表达观点 | 54 | `In my opinion`, `The thing is`, `To be honest` |
| 🟡 **4** | 高级表达 | 55 | `When it comes to`, `Having said that`, `As a result` |
| 🔴 **5** | 精通自动化 | 50 | `All things considered`, `Off the top of my head` |

📌 每级**全部达标后**，下一级**自动解锁**。

---

## 🎮 三种训练模式

| 模式 | 用途 | 方法 |
|:---:|------|------|
| 📖 **学习模式** | 初次接触 | 听英语 → 看释义 → 再听一遍，建立第一印象 |
| 🎯 **听辨模式** | ✨核心训练 | 听音频 → 4选1辨义，**连续3次正确**即"达标" |
| ⏱️ **自动化测试** | 终极检验 | **限时6秒**作答，3条命。失败退回重练 |

---

## 🚀 快速开始

### 系统要求
- **macOS**（使用系统内置 `say` 语音合成引擎，**零外部依赖**）
- **Python 3.6+**

### 安装运行

```bash
# 1. 下载
git clone https://github.com/wxin1068-beep/-ChunkEar.git
cd -ChunkEar

# 2. 直接运行
python3 trainer.py
```

就是这么简单。首次启动时自动进入主菜单，从 **0级（极简根基）** 开始。

---

## 📊 进度管理

学习进度自动保存在 `progress.json`，关掉终端再打开**不会丢**。

主菜单按 **`s`** 键查看统计：
- ✅ 各级达标数
- 📝 练习总次数
- 🎯 整体正确率

---

## 📁 项目结构

```
ChunkEar/
├── trainer.py       🖥️ 主程序（交互式听力训练器）
├── corpus.py        📖 语料库（6级250+语义模块）
├── run.sh           ▶️ 快捷启动脚本
├── progress.json    📈 用户进度（自动生成）
├── LICENSE          ⚖️ MIT 开源协议
└── README.md        📄 本文件
```

---

## 🗺️ 路线图

- [x] ✅ 6级语料库（250+ 模块）
- [x] ✅ 学习 / 听辨 / 自动化测试 三模式
- [x] ✅ 逐级解锁机制
- [x] ✅ 进度持久化与统计
- [ ] 📱 iOS / Android 原生App
- [ ] ✏️ 用户可自定义添加语义模块
- [ ] 📚 更多语料级别（专业领域）
- [ ] 🔔 间隔复习提醒
- [ ] 🌐 PWA 网页版同步

---

## 🤝 参与贡献

- **提 Issue**：发现 Bug 或有建议？
- **提 PR**：想加新语料或功能？
- **Star**：觉得有用就点个星 ⭐

---

## ⚖️ 开源协议

[MIT License](LICENSE) — 欢迎 Fork、PR、Issue。

---

## 🙏 致谢

本工具源于王大爷的英语学习理念：

> 🧠 **语义模块优先** — 语言的最小认知单元是语块，不是单词
> 👂 **听力先行** — 聋子英语是根本问题，先攻破耳朵
> 🎯 **自动化 > 知道** — 3000词滚到烂熟，远强于10000词半生不熟
> 📈 **逐级进阶** — 不达标不进下一级，每一步都踩实

> _学语言不是堆知识，是练肌肉。耳朵的肌肉，只能靠反复听来练。_
