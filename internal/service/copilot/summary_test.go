// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/lin-snow/ech0/internal/agent"
	"github.com/lin-snow/ech0/internal/kvstore"
	"github.com/lin-snow/ech0/internal/test/helpers"
	"github.com/stretchr/testify/require"
)

func TestGetRecent_ReturnsCachedValueWhileDirtyAndRefreshesInBackground(t *testing.T) {
	kv := kvstore.NewMemory()
	require.NoError(t, kv.Set(helpers.CtxAnonymous(), string(agent.GEN_RECENT), "old summary"))
	require.NoError(t, kv.Set(helpers.CtxAnonymous(), string(agent.GEN_RECENT_DIRTY), "1"))

	refreshed := make(chan struct{})
	s := &CopilotService{
		durableKV: kv,
		recentBuilder: func(ctx context.Context) (string, error) {
			close(refreshed)
			return "new summary", nil
		},
	}

	got, err := s.GetRecent(helpers.CtxAnonymous())
	require.NoError(t, err)
	require.Equal(t, "old summary", got)

	require.Eventually(t, func() bool {
		select {
		case <-refreshed:
		default:
			return false
		}
		value, err := kv.Get(helpers.CtxAnonymous(), string(agent.GEN_RECENT))
		if err != nil || value != "new summary" {
			return false
		}
		_, err = kv.Get(helpers.CtxAnonymous(), string(agent.GEN_RECENT_DIRTY))
		return errors.Is(err, kvstore.ErrNotFound)
	}, time.Second, 10*time.Millisecond)
}

func TestGetRecent_RefreshFailureKeepsCachedValueAndDirtyMarker(t *testing.T) {
	kv := kvstore.NewMemory()
	require.NoError(t, kv.Set(helpers.CtxAnonymous(), string(agent.GEN_RECENT), "old summary"))
	require.NoError(t, kv.Set(helpers.CtxAnonymous(), string(agent.GEN_RECENT_DIRTY), "1"))

	refreshed := make(chan struct{})
	s := &CopilotService{
		durableKV: kv,
		recentBuilder: func(ctx context.Context) (string, error) {
			close(refreshed)
			return "", errors.New("generate failed")
		},
	}

	got, err := s.GetRecent(helpers.CtxAnonymous())
	require.NoError(t, err)
	require.Equal(t, "old summary", got)

	require.Eventually(t, func() bool {
		select {
		case <-refreshed:
			return true
		default:
			return false
		}
	}, time.Second, 10*time.Millisecond)

	value, err := kv.Get(helpers.CtxAnonymous(), string(agent.GEN_RECENT))
	require.NoError(t, err)
	require.Equal(t, "old summary", value)

	dirty, err := kv.Get(helpers.CtxAnonymous(), string(agent.GEN_RECENT_DIRTY))
	require.NoError(t, err)
	require.Equal(t, "1", dirty)
}
