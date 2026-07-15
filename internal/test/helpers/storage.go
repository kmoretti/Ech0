// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

package helpers

import (
	"testing"

	"github.com/lin-snow/ech0/internal/config"
	"github.com/lin-snow/ech0/internal/storage"
)

func NewTestStorage(t *testing.T) *storage.Manager {
	t.Helper()
	return storage.NewStorageManagerForTest(t.TempDir())
}

func NewTestObjectStorage(t *testing.T) *storage.Manager {
	t.Helper()
	return storage.NewStorageManagerForTestWithConfig(config.StorageConfig{
		DataRoot:      t.TempDir(),
		ObjectEnabled: true,
		Provider:      "other",
		Endpoint:      "https://cdn.example.com",
		BucketName:    "bucket",
		CDNURL:        "https://cdn.example.com",
		UseSSL:        true,
	})
}
