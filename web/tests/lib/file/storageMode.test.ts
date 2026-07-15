// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { describe, expect, it } from 'vitest'
import { FILE_STORAGE_TYPE } from '@/constants/file'
import {
  resolveManagedUploadStorageType,
  resolveUploadSourceDisplayMode,
} from '@/lib/file/storage-mode'

describe('resolveManagedUploadStorageType', () => {
  it('uses object storage whenever s3 is enabled', () => {
    expect(resolveManagedUploadStorageType(true, FILE_STORAGE_TYPE.LOCAL)).toBe(
      FILE_STORAGE_TYPE.OBJECT,
    )
  })

  it('uses local storage whenever s3 is disabled', () => {
    expect(resolveManagedUploadStorageType(false, FILE_STORAGE_TYPE.OBJECT)).toBe(
      FILE_STORAGE_TYPE.LOCAL,
    )
  })

  it('keeps external links independent from managed storage', () => {
    expect(resolveManagedUploadStorageType(true, FILE_STORAGE_TYPE.EXTERNAL)).toBe(
      FILE_STORAGE_TYPE.EXTERNAL,
    )
  })
})

describe('resolveUploadSourceDisplayMode', () => {
  it('presents local and object storage as one managed upload option', () => {
    expect(resolveUploadSourceDisplayMode(FILE_STORAGE_TYPE.LOCAL)).toBe('managed')
    expect(resolveUploadSourceDisplayMode(FILE_STORAGE_TYPE.OBJECT)).toBe('managed')
  })

  it('presents external links separately from managed uploads', () => {
    expect(resolveUploadSourceDisplayMode(FILE_STORAGE_TYPE.EXTERNAL)).toBe('external')
  })
})
