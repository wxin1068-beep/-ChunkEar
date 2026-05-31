#!/usr/bin/env python3
"""
语义模块听力训练器 — 英语听力训练工具
用法: python3 trainer.py
"""

import os
import sys
import random
import json
import subprocess
import time

# 导入语料库
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corpus import LEVELS, get_level, get_level_summary, get_total_modules

# ======================== 配置 ========================

SAVE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "progress.json")
VOICE = "Samantha"  # Mac 内置美式女声
RATE_NORMAL = 200    # 正常语速
RATE_SLOW = 140      # 慢速
AUTOMATION_TIME_LIMIT = 6  # 自动化测试限时（秒）
AUTOMATION_CONSECUTIVE = 3  # 连续正确次数要求

# ======================== 基础功能 ========================

def clear_screen():
    """清屏"""
    os.system('clear' if os.name == 'posix' else 'cls')


def color(text, code):
    """终端颜色"""
    return f"\033[{code}m{text}\033[0m"


def color_bold(text, code):
    return f"\033[1;{code}m{text}\033[0m"


def speak(text, rate=RATE_NORMAL, voice=VOICE):
    """用 Mac TTS 朗读"""
    try:
        subprocess.run(
            ["say", "-v", voice, "-r", str(rate), text],
            capture_output=True, timeout=30
        )
    except Exception:
        # 降级到默认语音
        try:
            subprocess.run(["say", "-r", str(rate), text], capture_output=True, timeout=30)
        except Exception:
            pass


def speak_phrase(en_text, slow_also=True):
    """朗读语义模块：常速一遍，可选慢速一遍"""
    speak(en_text, rate=RATE_NORMAL)
    if slow_also:
        time.sleep(0.3)
        speak(en_text, rate=RATE_SLOW)


def wait_enter(msg="按 Enter 继续……"):
    input(f"  {color(msg, '2')}")


# ======================== 进度管理 ========================

def load_progress():
    """加载进度文件"""
    if os.path.exists(SAVE_FILE):
        try:
            with open(SAVE_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {}


def save_progress(progress):
    """保存进度"""
    with open(SAVE_FILE, "w") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def get_module_key(level_id, eng_text):
    """生成模块唯一key"""
    return f"L{level_id}_{eng_text}"


def init_module_progress(progress, level_id, eng_text, chn_text):
    """初始化模块进度"""
    key = get_module_key(level_id, eng_text)
    if key not in progress:
        progress[key] = {
            "eng": eng_text,
            "chn": chn_text,
            "level": level_id,
            "correct_in_row": 0,     # 连续正确次数
            "total_attempts": 0,     # 总尝试次数
            "total_correct": 0,      # 总正确次数
            "passed": False,         # 是否达标
            "practice_count": 0,     # 学过几次
        }
    return progress[key]


def check_level_passed(progress, level_id):
    """检查某个级别是否全部达标"""
    level = get_level(level_id)
    if not level:
        return False
    for eng_text, chn_text in level["modules"]:
        key = get_module_key(level_id, eng_text)
        if key not in progress or not progress[key].get("passed", False):
            return False
    return True


def check_level_available(level_id):
    """检查某个级别是否已解锁（前一级别必须全部达标，0级自动解锁）"""
    if level_id == 0:
        return True
    return check_level_passed(load_progress(), level_id - 1)


# ======================== 学习模式 ========================

def learn_mode(level):
    """模式一：学习模式 — 听+看+理解"""
    progress = load_progress()
    modules = level["modules"]
    total = len(modules)

    clear_screen()
    print(f"\n  {color_bold('📖 学习模式', '36')}  {color(level['name'], level['color'])}")
    print(f"  {color('─' * 60, '2')}")
    print(f"  共 {total} 个语义模块，逐个学习")
    print(f"  流程：听英语 → 看释义 → 再听一遍\n")

    for idx, (eng_text, chn_text) in enumerate(modules, 1):
        p = init_module_progress(progress, level["id"], eng_text, chn_text)
        p["practice_count"] += 1

        print(f"\n  {color_bold(f'[{idx}/{total}]', '33')} {color(eng_text, '97')}")

        # 第一步：听英语
        print(f"  {color('🔊 听...', '2')}", end="", flush=True)
        speak_phrase(eng_text)
        print(f" {color('✓', '32')}")

        # 第二步：展示英语文本 + 中文释义
        print(f"  ┌─ {color_bold(eng_text, '97')}")
        print(f"  └─ {color(chn_text, '32')}")

        # 第三步：再听一遍
        print(f"  {color('🔊 再听一遍...', '2')}", end="", flush=True)
        speak(eng_text, rate=RATE_NORMAL)
        print(f" {color('✓', '32')}")

        print()
        wait_enter()

    # 学习完毕后保存进度
    save_progress(progress)
    print(f"\n  {color_bold('🎉 本级学习完成！', '32')}")


# ======================== 听辨模式 ========================

def generate_options(correct_chn, all_modules, exclude=None, count=3):
    """生成干扰选项"""
    options = [correct_chn]
    candidates = [m for m in all_modules if m[1] != correct_chn and m[0] != exclude]
    sampled = random.sample(candidates, min(count, len(candidates)))
    options.extend([s[1] for s in sampled])
    random.shuffle(options)
    return options


def practice_mode(level):
    """模式二：听辨模式 — 听音辨义"""
    progress = load_progress()
    modules = level["modules"]
    all_modules = []  # 用于抽取干扰项
    for lvl in LEVELS:
        all_modules.extend(lvl["modules"])

    # 找出未达标的模块
    active_modules = []
    for eng_text, chn_text in modules:
        key = get_module_key(level["id"], eng_text)
        p = init_module_progress(progress, level["id"], eng_text, chn_text)
        if not p["passed"]:
            active_modules.append((eng_text, chn_text))

    if not active_modules:
        clear_screen()
        print(f"\n  {color_bold('🎉 本级所有模块已达标！', '32')}")
        wait_enter()
        return

    clear_screen()
    round_num = 1
    session_correct = 0
    session_total = 0

    while active_modules:
        clear_screen()
        print(f"\n  {color_bold('🎯 听辨模式', '33')}  {color(level['name'], level['color'])}")
        print(f"  {color('─' * 60, '2')}")
        passed = sum(1 for e, c in modules if load_progress().get(get_module_key(level["id"], e), {}).get("passed", False))
        total = len(modules)
        print(f"  本局: 第{round_num}轮  |  已达标: {color_bold(str(passed), '32')}/{total}")
        print(f"  本轮: {len(active_modules)}个待攻克  |  本轮正确率: {session_correct}/{session_total}")
        print(f"  {color('─' * 60, '2')}")
        print()

        # 随机选一个未达标模块
        eng_text, chn_text = random.choice(active_modules)
        key = get_module_key(level["id"], eng_text)

        # 播放英语
        print(f"  {color('🔊 听...', '2')}", end="", flush=True)
        speak(eng_text, rate=RATE_NORMAL)
        print()

        # 生成选项
        options = generate_options(chn_text, all_modules, eng_text)
        labels = ["1", "2", "3", "4"]

        print(f"\n  {color_bold('哪个是它的中文意思？', '97')}")
        for i, opt in enumerate(options):
            marker = color(f" {labels[i]} ", "2")
            print(f"  {marker} {opt}")

        print()
        choice = input(f"  {color('请输入1-4:', '36')} ").strip()

        if choice == "q":
            save_progress(progress)
            print(f"  {color('已保存进度。', '2')}")
            return

        selected = options[int(choice) - 1] if choice.isdigit() and 1 <= int(choice) <= 4 else None
        session_total += 1
        p = progress[key]
        p["total_attempts"] += 1

        if selected == chn_text:
            p["correct_in_row"] += 1
            p["total_correct"] += 1
            session_correct += 1
            print(f"\n  {color_bold('✓ 正确！', '32')} ", end="")

            # 检查是否达标
            if p["correct_in_row"] >= AUTOMATION_CONSECUTIVE:
                p["passed"] = True
                print(f"{color_bold('🏆 达标！进入自动化区！', '33')}")
                # 从当前列表中移除
                active_modules = [(e, c) for e, c in active_modules if e != eng_text or c != chn_text]
            else:
                need = AUTOMATION_CONSECUTIVE - p["correct_in_row"]
                print(f"还需连续正确 {color_bold(str(need), '33')} 次")
                # 已达标但还没从列表移除，不移除——下一轮重新检测
                if p["passed"]:
                    active_modules = [(e, c) for e, c in active_modules if e != eng_text or c != chn_text]
        else:
            p["correct_in_row"] = 0
            print(f"\n  {color_bold('✗ 不对', '31')}")
            print(f"  正确答案: {color_bold(chn_text, '32')}")
            print(f"  {color('🔊 再听一遍...', '2')}", end="", flush=True)
            speak(eng_text, rate=RATE_SLOW)
            print()

        save_progress(progress)
        round_num += 1

        if not active_modules:
            print(f"\n  {color_bold('🎉 本轮练习全部达标！', '32')}")
            wait_enter()
            return

        print()
        print(f"  {color('按 Enter 继续，输入 q 退出', '2')}", end="")
        cmd = input().strip().lower()
        if cmd == "q":
            save_progress(progress)
            print(f"  {color('已保存进度。', '2')}")
            return


# ======================== 自动化测试 ========================

def automation_test(level):
    """模式三：自动化测试 — 限时反应，测试是否真正达到自动化"""
    progress = load_progress()
    modules = level["modules"]
    all_modules = []
    for lvl in LEVELS:
        all_modules.extend(lvl["modules"])

    # 找出已达标但需要验证自动化的模块
    test_modules = []
    for eng_text, chn_text in modules:
        key = get_module_key(level["id"], eng_text)
        p = init_module_progress(progress, level["id"], eng_text, chn_text)
        if p["passed"]:
            test_modules.append((eng_text, chn_text))

    if not test_modules:
        clear_screen()
        print(f"\n  {color_bold('⚠️ 本级尚无已达标的模块。', '33')}")
        print(f"  请先在【听辨模式】中练习达标。")
        wait_enter()
        return

    clear_screen()
    print(f"\n  {color_bold('⏱️  自动化测试', '31')}  {color(level['name'], level['color'])}")
    print(f"  {color('─' * 60, '2')}")
    print(f"  限时 {AUTOMATION_TIME_LIMIT} 秒内选出答案")
    print(f"  3次错→此轮失败，重新练")
    print(f"  真正的自动化 = 不假思索秒答")
    print(f"  {color('─' * 60, '2')}")
    wait_enter()

    # 每个模块测试连续正确次数
    test_queue = test_modules.copy()
    random.shuffle(test_queue)
    lives = 3
    passed_test = []
    current_idx = 0

    while current_idx < len(test_queue) and lives > 0:
        clear_screen()
        print(f"\n  {color_bold('⏱️  自动化测试', '31')}  {color(level['name'], level['color'])}")
        print(f"  {color('─' * 60, '2')}")
        print(f"  剩余生命: {color_bold('❤️' * lives + '🖤' * (3-lives), '31')}")
        print(f"  进度: {len(passed_test)}/{len(test_modules)} 已通过")
        print()

        eng_text, chn_text = test_queue[current_idx]
        key = get_module_key(level["id"], eng_text)
        p = progress[key]

        # 播放英语一次（常速）
        print(f"  {color('🔊 听（仅一遍）...', '2')}", end="", flush=True)
        speak(eng_text, rate=RATE_NORMAL)
        print(f" {color('✓', '32')}")

        options = generate_options(chn_text, all_modules, eng_text)
        labels = ["1", "2", "3", "4"]

        print(f"\n  {color_bold('哪个是它的中文意思？', '97')}")
        for i, opt in enumerate(options):
            marker = color(f" {labels[i]} ", "2")
            print(f"  {marker} {opt}")

        # 限时输入
        print(f"\n  {color(f'⏱️ 请在 {AUTOMATION_TIME_LIMIT} 秒内输入1-4:', '33')}", end=" ", flush=True)

        import select
        # 非阻塞输入
        start_time = time.time()
        choice = ""
        while time.time() - start_time < AUTOMATION_TIME_LIMIT:
            if sys.stdin in select.select([sys.stdin], [], [], 0.1)[0]:
                choice = sys.stdin.readline().strip()
                break

        elapsed = time.time() - start_time

        if not choice:
            print(f"\n  {color_bold(f'✗ 超时！({elapsed:.1f}秒)', '31')}")
            lives -= 1
            print(f"  {color('🔊 慢速回放...', '2')}", end="", flush=True)
            speak(eng_text, rate=RATE_SLOW)
            print()
            wait_enter()
            continue

        selected = options[int(choice) - 1] if choice.isdigit() and 1 <= int(choice) <= 4 else None

        if selected == chn_text and elapsed < AUTOMATION_TIME_LIMIT:
            p["correct_in_row"] = max(p["correct_in_row"], AUTOMATION_CONSECUTIVE)
            print(f"\n  {color_bold(f'✓ 正确！({elapsed:.1f}秒)', '32')}")
            passed_test.append(test_queue[current_idx])
            current_idx += 1
            save_progress(progress)
        else:
            if selected and selected != chn_text:
                print(f"\n  {color_bold(f'✗ 错误 ({elapsed:.1f}秒)', '31')}")
                print(f"  正确答案: {color_bold(chn_text, '32')}")
            else:
                print(f"\n  {color_bold(f'✗ 输入无效！({elapsed:.1f}秒)', '31')}")
            lives -= 1
            p["correct_in_row"] = 0
            progress[key]["passed"] = False  # 撤销达标状态，重新练
            print(f"  {color('🔊 慢速回放...', '2')}", end="", flush=True)
            speak(eng_text, rate=RATE_SLOW)
            print()
            wait_enter()

        save_progress(progress)

    clear_screen()
    if current_idx >= len(test_queue):
        print(f"\n  {color_bold('🏆🏆🏆 自动化测试全部通过！', '33')}")
        print(f"  {color('恭喜！本级 {0} 个模块已达到自动化水平！'.format(len(passed_test)), '32')}")
        print(f"  {color_bold('你可以进入下一级了！', '36')}")
    else:
        print(f"\n  {color_bold(f'💔 生命耗尽！通过 {len(passed_test)}/{len(test_modules)}', '31')}")
        print(f"  {color('失败的模块已重置，请返回听辨模式再练练。', '33')}")

    wait_enter()


# ======================== 主界面 ========================

def show_level_status(level):
    """显示级别状态"""
    progress = load_progress()
    modules = level["modules"]
    passed = 0
    in_progress = 0
    for eng_text, _ in modules:
        key = get_module_key(level["id"], eng_text)
        if key in progress:
            if progress[key].get("passed", False):
                passed += 1
            elif progress[key].get("total_attempts", 0) > 0:
                in_progress += 1

    total = len(modules)
    status_str = ""
    if passed == total:
        status_str = color_bold(" ✅ 已全部达标", "32")
    elif passed > 0:
        status_str = f" {color(f'[{passed}/{total} 已达标]', '33')}"
        if in_progress > 0:
            status_str += f" {color(f'{in_progress}个练习中', '2')}"
    else:
        status_str = f" {color(f'[{passed}/{total}]', '2')}"

    return status_str


def main_menu():
    """主菜单"""
    while True:
        clear_screen()
        total = get_total_modules()
        print(f"\n  {color_bold('🎧 语义模块听力训练系统', '36')}")
        print(f"  {color('─' * 60, '2')}")
        print(f"  语料库: {color_bold(str(total), '97')} 个语义模块，分 {len(LEVELS)} 级递进")
        print(f"  核心理念: {color('从最简单开始 → 逐级自动化 → 不达标不进阶', '2')}")
        print(f"  {color('─' * 60, '2')}")

        for level in LEVELS:
            status = show_level_status(level)
            locked = not check_level_available(level["id"])
            lid = level["id"]
            lname = level["name"]
            if locked:
                print(f"  {color(f'{lid}.', '2')} {color(f'🔒 {lname}', '2')}  {color('[需完成上一级]', '2')}")
            else:
                print(f"  {color(f'{lid}.', level['color'])} {color_bold(lname, level['color'])}  {status}")
                print(f"     {color(level['desc'], '2')}")

        print(f"\n  {color('─' * 60, '2')}")
        print(f"  {color('a.', '33')} 学习模式    {color('b.', '33')} 听辨模式    {color('c.', '33')} 自动化测试")
        print(f"  {color('s.', '36')} 查看统计    {color('q.', '31')} 退出")
        print()

        choice = input(f"  {color('请选择:', '36')} ").strip().lower()

        if choice == "q":
            clear_screen()
            print(f"\n  {color_bold('🎯 继续加油！每天练一点，耳朵会越来越灵的。', '36')}")
            print(f"  {color('王大爷，您的理论方向完全正确！', '2')}")
            print()
            sys.exit(0)

        elif choice == "s":
            show_statistics()

        elif choice in ("a", "b", "c"):
            # 选择级别
            clear_screen()
            print(f"\n  {color_bold('选择级别:', '36')}")
            for level in LEVELS:
                lid = level["id"]
                lname = level["name"]
                locked = not check_level_available(lid)
                if locked:
                    print(f"  {color(f'{lid}. 🔒 {lname} [需完成上一级]', '2')}")
                else:
                    status = show_level_status(level)
                    print(f"  {color(f'{lid}.', level['color'])} {lname}{status}")

            print(f"  {color('b.', '36')} 返回")
            lvl_choice = input(f"\n  {color('选择级别编号:', '36')} ").strip()

            if lvl_choice == "b":
                continue

            if lvl_choice.isdigit():
                level_id = int(lvl_choice)
                level = get_level(level_id)
                if level:
                    if not check_level_available(level_id):
                        print(f"\n  {color_bold('🔒 此级别未解锁，请先完成上一级所有模块。', '31')}")
                        wait_enter()
                        continue

                    if choice == "a":
                        learn_mode(level)
                    elif choice == "b":
                        practice_mode(level)
                    elif choice == "c":
                        automation_test(level)

        else:
            print(f"\n  {color('无效选择。', '31')}")
            time.sleep(0.5)


def show_statistics():
    """显示学习统计"""
    progress = load_progress()
    clear_screen()
    print(f"\n  {color_bold('📊 学习统计', '36')}")
    print(f"  {color('─' * 60, '2')}")

    total_passed = 0
    total_attempts = 0
    total_correct = 0

    for level in LEVELS:
        modules = level["modules"]
        level_passed = 0
        level_attempts = 0
        level_correct = 0

        for eng_text, chn_text in modules:
            key = get_module_key(level["id"], eng_text)
            if key in progress:
                p = progress[key]
                if p.get("passed", False):
                    level_passed += 1
                level_attempts += p.get("total_attempts", 0)
                level_correct += p.get("total_correct", 0)

        total_passed += level_passed
        total_attempts += level_attempts
        total_correct += level_correct

        accuracy = (level_correct / level_attempts * 100) if level_attempts > 0 else 0
        bar_len = 20
        filled = int(bar_len * level_passed / len(modules))
        bar = "█" * filled + "░" * (bar_len - filled)

        print(f"\n  {color(level['name'], level['color'])}")
        print(f"  {color(f'{bar}', '2')} {color_bold(str(level_passed), '97')}/{len(modules)} 已达标")
        print(f"  练习 {level_attempts} 次, 正确率 {accuracy:.0f}%")

    print(f"\n  {color('─' * 60, '2')}")
    overall_accuracy = (total_correct / total_attempts * 100) if total_attempts > 0 else 0
    print(f"  全局: {total_passed}/{get_total_modules()} 达标  |  总练习 {total_attempts} 次  |  整体正确率 {overall_accuracy:.0f}%")

    print(f"\n  {color('提示: 每级所有模块达标后，下一级自动解锁。', '2')}")
    wait_enter()


# ======================== 入口 ========================

def check_mac():
    """检查是否在 Mac 上"""
    if sys.platform != "darwin":
        print(f"\n  {color_bold('⚠️  此工具需在 macOS 上运行（使用内置语音合成）', '31')}")
        print(f"  当前系统: {sys.platform}")
        return False
    # 检查 say 命令
    try:
        subprocess.run(["which", "say"], capture_output=True, check=True)
    except:
        print(f"\n  {color_bold('⚠️  未找到 say 命令', '31')}")
        return False
    return True


def main():
    if not check_mac():
        sys.exit(1)

    # 检查内置语音
    global VOICE
    try:
        result = subprocess.run(["say", "-v", "?"], capture_output=True, text=True, timeout=5)
        if "Samantha" not in result.stdout:
            # 找一个美式女声
            for name in ["Samantha", "Karen", "Moira", "Tessa", "Veena"]:
                if name in result.stdout:
                    VOICE = name
                    break
    except:
        pass

    main_menu()


if __name__ == "__main__":
    main()
