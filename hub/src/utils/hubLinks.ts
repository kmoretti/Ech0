// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

/** Hub 反馈入口，部署时可覆盖 */

const trim = (v: string | undefined) => (v ?? '').trim()

export function getHubSubmitIssueUrl(): string {
  return (
    trim(import.meta.env.VITE_HUB_SUBMIT_ISSUE_URL) ||
    'https://github.com/LiuShen-Fork/Ech0/discussions'
  )
}
