// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

export function siteUrl(): string {
  const raw = import.meta.env.VITE_SITE_URL ?? "https://www.ech0.app";
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const base = siteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export const SITE_NAME = "提笔摘星";

export const DEFAULT_DESCRIPTION =
  "清羽飞扬基于 Ech0 打造的个人个性化说说程序，用于记录想法、文字、图片与链接。";
