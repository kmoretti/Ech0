// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/lin-snow/ech0/internal/agent"
	"github.com/lin-snow/ech0/internal/i18n"
	commonModel "github.com/lin-snow/ech0/internal/model/common"
	logUtil "github.com/lin-snow/ech0/pkg/log"
	"github.com/lin-snow/ech0/pkg/viewer"
)

func (s *CopilotService) GetRecent(ctx context.Context) (string, error) {
	const cacheKey = string(agent.GEN_RECENT)
	const dirtyKey = string(agent.GEN_RECENT_DIRTY)

	if value, ok := s.getRecentFromCache(ctx, cacheKey); ok {
		if s.isRecentDirty(ctx, dirtyKey) {
			s.refreshRecentInBackground(cacheKey, dirtyKey)
		}
		return value, nil
	}

	return s.generateAndCacheRecent(ctx, cacheKey, dirtyKey)
}

func (s *CopilotService) generateAndCacheRecent(ctx context.Context, cacheKey string, dirtyKey string) (string, error) {
	value, err, _ := s.recentGenGroup.Do(cacheKey, func() (any, error) {
		if cached, ok := s.getRecentFromCache(ctx, cacheKey); ok {
			if s.isRecentDirty(ctx, dirtyKey) {
				output, err := s.buildRecentSummary(ctx)
				if err != nil {
					return cached, nil
				}
				if err := s.durableKV.Set(ctx, cacheKey, output); err != nil {
					logUtil.GetLogger().
						Error("Failed to add or update key value", logUtil.Err(err))
					return output, nil
				}
				if err := s.durableKV.Delete(ctx, dirtyKey); err != nil {
					logUtil.GetLogger().
						Error("Failed to clear recent summary dirty flag", logUtil.Err(err))
				}
				return output, nil
			}
			return cached, nil
		}

		output, err := s.buildRecentSummary(ctx)
		if err != nil {
			return "", err
		}

		if err := s.durableKV.Set(ctx, cacheKey, output); err != nil {
			logUtil.GetLogger().
				Error("Failed to add or update key value", logUtil.Err(err))
			return output, nil
		}
		if err := s.durableKV.Delete(ctx, dirtyKey); err != nil {
			logUtil.GetLogger().
				Error("Failed to clear recent summary dirty flag", logUtil.Err(err))
		}

		return output, nil
	})
	if err != nil {
		return "", err
	}

	recent, ok := value.(string)
	if !ok {
		return "", errors.New("recent summary type assertion failed")
	}

	return recent, nil
}

func (s *CopilotService) isRecentDirty(ctx context.Context, dirtyKey string) bool {
	_, err := s.durableKV.Get(ctx, dirtyKey)
	return err == nil
}

func (s *CopilotService) refreshRecentInBackground(cacheKey string, dirtyKey string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if _, err := s.generateAndCacheRecent(ctx, cacheKey, dirtyKey); err != nil {
			logUtil.GetLogger().Error("Failed to refresh recent summary", logUtil.Err(err))
		}
	}()
}

func (s *CopilotService) getRecentFromCache(ctx context.Context, cacheKey string) (string, bool) {
	cachedValue, err := s.durableKV.Get(ctx, cacheKey)
	if err != nil {
		return "", false
	}
	return cachedValue, true
}

func (s *CopilotService) buildRecentSummary(ctx context.Context) (string, error) {
	if s.recentBuilder != nil {
		return s.recentBuilder(ctx)
	}

	systemCtx := viewer.WithContext(ctx, viewer.NewSystemViewer())
	echos, err := s.echoService.GetEchosByPage(
		systemCtx,
		commonModel.PageQueryDto{
			Page:     1,
			PageSize: 10,
		},
	)
	if err != nil {
		return "", err
	}

	var memos []agent.Message
	for i, e := range echos.Items {
		content := fmt.Sprintf(
			"用户 %s 在 %s 发布了内容 %d ：%s 。 内容标签为：%v。",
			e.Username,
			time.Unix(e.CreatedAt, 0).UTC().Format("2006-01-02 15:04"),
			i+1,
			e.Content,
			e.Tags,
		)

		memos = append(memos, agent.Message{
			Role:    agent.RoleUser,
			Content: content,
		})
	}

	locale := i18n.SystemDefaultLocale()
	in := []agent.Message{
		{
			Role:    agent.RoleSystem,
			Content: summarySystemPromptFor(locale),
		},
		{
			Role:    agent.RoleUser,
			Content: summaryUserPromptFor(locale),
		},
	}

	in = append(in, memos...)

	setting, err := s.agentSetting(ctx)
	if err != nil {
		return "", err
	}

	output, err := agent.Generate(ctx, setting, in, true, nil)
	if err != nil {
		return "", err
	}

	return output, nil
}
