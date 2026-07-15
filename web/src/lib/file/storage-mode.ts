// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { FILE_STORAGE_TYPE, type FileStorageType } from '@/constants/file'

export type UploadSourceDisplayMode = 'external' | 'managed'

export function resolveManagedUploadStorageType(
  s3Enabled: boolean,
  requested?: App.Api.File.StorageType,
): FileStorageType {
  if (requested === FILE_STORAGE_TYPE.EXTERNAL) return FILE_STORAGE_TYPE.EXTERNAL
  return s3Enabled ? FILE_STORAGE_TYPE.OBJECT : FILE_STORAGE_TYPE.LOCAL
}

export function resolveUploadSourceDisplayMode(
  storageType: App.Api.File.StorageType,
): UploadSourceDisplayMode {
  return storageType === FILE_STORAGE_TYPE.EXTERNAL ? 'external' : 'managed'
}
