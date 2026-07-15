// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FILE_CATEGORY, FILE_STORAGE_TYPE } from '@/constants/file'

const apiMocks = vi.hoisted(() => ({
  fetchUploadFile: vi.fn(),
  fetchGetPresignedUrl: vi.fn(),
  fetchUpdateFileMeta: vi.fn(),
}))

const uploadMocks = vi.hoisted(() => ({
  httpUpload: vi.fn(),
}))

vi.mock('@/service/api', () => ({
  fetchUploadFile: apiMocks.fetchUploadFile,
  fetchGetPresignedUrl: apiMocks.fetchGetPresignedUrl,
  fetchUpdateFileMeta: apiMocks.fetchUpdateFileMeta,
  fetchCreateExternalFile: vi.fn(),
  fetchDeleteFile: vi.fn(),
  fetchGetFileById: vi.fn(),
}))

vi.mock('@/lib/file/upload', () => ({
  UPLOAD_KIND: { LOCAL: 'local', S3: 's3' },
  httpUpload: uploadMocks.httpUpload,
}))

describe('file api adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads object files through presign and s3 put', async () => {
    const file = new File([new Uint8Array(8)], 'avatar.png', { type: 'image/png' })
    apiMocks.fetchGetPresignedUrl.mockResolvedValue({
      code: 1,
      msg: 'ok',
      data: {
        id: 'obj-1',
        file_name: 'avatar.png',
        content_type: 'image/png',
        key: 'avatar-key.png',
        presign_url: 'https://s3.example.com/avatar-key.png?sig=1',
        file_url: 'https://cdn.example.com/avatar-key.png',
      },
    })
    uploadMocks.httpUpload.mockResolvedValue({ responseBody: null })
    apiMocks.fetchUpdateFileMeta.mockResolvedValue({
      code: 1,
      msg: 'ok',
      data: {
        id: 'obj-1',
        key: 'avatar-key.png',
        url: 'https://cdn.example.com/avatar-key.png',
        storage_type: FILE_STORAGE_TYPE.OBJECT,
        category: FILE_CATEGORY.IMAGE,
        content_type: 'image/png',
        size: 8,
      },
    })

    const { uploadFile } = await import('@/lib/file/api/adapter')
    const result = await uploadFile({
      file,
      category: FILE_CATEGORY.IMAGE,
      storageType: FILE_STORAGE_TYPE.OBJECT,
    })

    expect(apiMocks.fetchUploadFile).not.toHaveBeenCalled()
    expect(apiMocks.fetchGetPresignedUrl).toHaveBeenCalledWith(
      'avatar.png',
      'image/png',
      FILE_STORAGE_TYPE.OBJECT,
    )
    expect(uploadMocks.httpUpload).toHaveBeenCalledWith(file, {
      kind: 's3',
      presignUrl: 'https://s3.example.com/avatar-key.png?sig=1',
      contentType: 'image/png',
    })
    expect(apiMocks.fetchUpdateFileMeta).toHaveBeenCalledWith('obj-1', {
      size: 8,
      content_type: 'image/png',
    })
    expect(result.storageType).toBe(FILE_STORAGE_TYPE.OBJECT)
    expect(result.url).toBe('https://cdn.example.com/avatar-key.png')
  })
})
