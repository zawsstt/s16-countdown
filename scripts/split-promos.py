#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把原始画质宣传片按「场景切换点」无损切成 <25MiB 的片段。

- 只做 -c copy 流复制，不重编码，画质与原片完全一致
- 切点优先选在场景硬切处（画面本来就跳一下），接缝几乎不可见
- 输出带 +faststart，保证边下边播
"""
import json
import math
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'r2-upload', 'assets', 'aistudio')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'aistudio')

# 目标片段大小（MiB）。Cloudflare Pages 硬上限 25MiB，留出余量
TARGET_MIB = 22.0
HARD_LIMIT = 25 * 1024 * 1024

# 源文件 -> 输出前缀
JOBS = [
    ('___________________2026_Worlds-1920x1080-avc1-mp4a_a4396124.mp4', 'promo1'),
    ('___________________2026_Worlds-1920x1080-avc1-mp4a_36e76d38.mp4', 'promo2'),
    ('promo_knockout_opening_2026.mp4', 'promo3'),
]


def probe(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size',
         '-of', 'json', path],
        capture_output=True, text=True, check=True,
    ).stdout
    d = json.loads(out)['format']
    return float(d['duration']), int(d['size'])


def scene_times(path):
    """返回画面硬切的时间点（秒）"""
    proc = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', path,
         '-vf', "select='gt(scene,0.30)',showinfo", '-an', '-f', 'null', '-'],
        capture_output=True, text=True,
    )
    times = []
    for m in re.finditer(r'pts_time:([0-9.]+)', proc.stderr):
        times.append(float(m.group(1)))
    return sorted(times)


def pick_boundaries(duration, parts, scenes, min_gap=12.0):
    """在理想等分点附近挑最近的场景切换点，避免切在镜头中间"""
    bounds = []
    for i in range(1, parts):
        ideal = duration * i / parts
        cands = [s for s in scenes if abs(s - ideal) <= 10.0]
        if cands:
            pick = min(cands, key=lambda s: abs(s - ideal))
        else:
            pick = ideal
        # 保证相邻切点间隔足够，避免切出碎片
        if bounds and pick - bounds[-1] < min_gap:
            pick = ideal
        if bounds and pick - bounds[-1] < min_gap:
            continue
        if duration - pick < min_gap:
            continue
        bounds.append(pick)
    return bounds


def split_once(src, prefix, bounds, workdir):
    """用 segment muxer 一次性切分（保证不丢帧、不重叠）"""
    pattern = os.path.join(workdir, f'{prefix}_raw_%02d.mp4')
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
           '-c', 'copy', '-f', 'segment', '-reset_timestamps', '1',
           '-map', '0', '-segment_format', 'mp4']
    if bounds:
        cmd += ['-segment_times', ','.join(f'{b:.3f}' for b in bounds)]
    cmd.append(pattern)
    subprocess.run(cmd, check=True)
    return sorted(
        os.path.join(workdir, f) for f in os.listdir(workdir)
        if f.startswith(f'{prefix}_raw_') and f.endswith('.mp4')
    )


def finalize(raw_path, out_path):
    """重新封装加 faststart"""
    subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', raw_path,
         '-c', 'copy', '-movflags', '+faststart', out_path],
        check=True,
    )
    return os.path.getsize(out_path)


def main():
    workdir = os.path.join(ROOT, '.tmp_split')
    os.makedirs(workdir, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    summary = []
    for fname, prefix in JOBS:
        src = os.path.join(SRC_DIR, fname)
        if not os.path.exists(src):
            print(f'!! 缺少源文件: {src}')
            continue

        duration, size = probe(src)
        mib = size / 1048576
        parts = max(2, math.ceil(size / (TARGET_MIB * 1048576)))
        print(f'\n=== {prefix}  {duration:.1f}s  {mib:.1f}MiB  计划切 {parts} 段')

        scenes = scene_times(src)
        print(f'    检测到 {len(scenes)} 个场景切换点')

        for attempt in range(4):
            bounds = pick_boundaries(duration, parts, scenes)
            for f in os.listdir(workdir):
                os.remove(os.path.join(workdir, f))
            raws = split_once(src, prefix, bounds, workdir)
            sizes = [os.path.getsize(r) for r in raws]
            print(f'    切点 {["%.1f" % b for b in bounds]} -> {len(raws)} 段, '
                  f'最大 {max(sizes) / 1048576:.1f}MiB')
            if max(sizes) < HARD_LIMIT * 0.98:
                break
            parts += 1
            print(f'    有片段超过 25MiB，改为 {parts} 段重切')

        for i, raw in enumerate(raws, 1):
            out = os.path.join(OUT_DIR, f'{prefix}_p{i}.mp4')
            final_size = finalize(raw, out)
            summary.append((os.path.basename(out), final_size))
            print(f'    -> {os.path.basename(out)}  {final_size / 1048576:.1f}MiB')

    print('\n=== 汇总 ===')
    total = 0
    for name, s in summary:
        total += s
        print(f'{s / 1048576:6.1f} MiB  {name}')
    print(f'{total / 1048576:6.1f} MiB  合计 {len(summary)} 段')

    over = [n for n, s in summary if s >= HARD_LIMIT]
    if over:
        print('\n!! 以下片段超过 25MiB，部署会失败:')
        for n in over:
            print('   ', n)
        sys.exit(1)
    print('\n全部片段均 < 25MiB ✅')


if __name__ == '__main__':
    main()
