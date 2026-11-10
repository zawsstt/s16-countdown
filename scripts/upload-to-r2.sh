#!/usr/bin/env bash
# ============================================================================
# 把原始画质宣传片上传到 Cloudflare R2
# ============================================================================
# 用法：
#   1. 先在 Cloudflare 后台开通 R2，并建一个桶（例如 s16-media）
#   2. 在本项目根目录执行：
#        bash scripts/upload-to-r2.sh s16-media
#   3. 按提示在浏览器里完成 Cloudflare 授权（wrangler login）
#
# 说明：脚本用 wrangler 的 OAuth 登录，不需要手动创建 API 密钥。
#      上传后桶内路径为 assets/aistudio/xxx.mp4，与站内路径完全一致。
# ============================================================================
set -euo pipefail

BUCKET="${1:-s16-media}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/r2-upload/assets/aistudio"

if [ ! -d "$SRC" ]; then
  echo "❌ 找不到 $SRC"
  echo "   请确认 r2-upload/ 目录存在（该目录被 .gitignore 排除，需要本地保留）"
  exit 1
fi

echo "==> 目标桶: $BUCKET"
echo "==> 源目录: $SRC"
echo

# 确保 wrangler 可用
if ! command -v wrangler >/dev/null 2>&1; then
  echo "==> 安装 wrangler（首次运行需要下载，约 30MB）"
  npm install -g wrangler
fi

echo "==> 登录 Cloudflare（会打开浏览器，授权后回到终端）"
wrangler login

echo
echo "==> 开始上传"
cd "$SRC"
for f in *.mp4; do
  key="assets/aistudio/$f"
  size=$(du -m "$f" | cut -f1)
  echo "    $f (${size}MB) -> r2://$BUCKET/$key"
  wrangler r2 object put "$BUCKET/$key" --file "$f" --remote
done

echo
echo "✅ 全部上传完成"
echo
echo "接下来："
echo "  1. Cloudflare 后台 → R2 → $BUCKET → Settings → Public access → 打开"
echo "  2. 记下公开域名（形如 https://pub-xxxxxxxx.r2.dev）"
echo "  3. 把该域名填进 .env.production 的 VITE_MEDIA_BASE_URL"
