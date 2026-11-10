/**
 * ============================================================================
 * 视频外挂地址解析
 * ============================================================================
 * 默认从本站 /assets/... 读取（Cloudflare Pages 单文件上限 25MiB，所以本地版本是压缩过的）。
 *
 * 若设置了环境变量 VITE_MEDIA_BASE_URL（例如 Cloudflare R2 的公开域名），
 * 所有宣传片会自动改为从该域名加载，从而使用**未压缩的原始画质**。
 *
 * 用法：
 *   .env.local 里写  VITE_MEDIA_BASE_URL="https://pub-xxxxxxxx.r2.dev"
 *   → mediaUrl('assets/aistudio/a.mp4') 变成 'https://pub-xxxxxxxx.r2.dev/assets/aistudio/a.mp4'
 *
 * 只要 R2 桶里保持同样的目录结构（assets/aistudio/...），就不需要改任何其它代码。
 */

const RAW_BASE = (import.meta.env.VITE_MEDIA_BASE_URL as string | undefined) || '';
const MEDIA_BASE = RAW_BASE.trim().replace(/\/+$/, '');

/** 是否已启用外部媒体源 */
export const isExternalMediaEnabled = MEDIA_BASE.length > 0;

/** 把站内绝对路径解析为实际可访问的地址 */
export function mediaUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (!MEDIA_BASE) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  return `${MEDIA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
