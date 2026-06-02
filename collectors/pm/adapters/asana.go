// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package adapters

import (
	"encoding/json"
	"net/http"
	"os"
	"time"
)

type AsanaAdapter struct {
	WorkspaceID string
	APIKey      string
}

type AsanaTask struct {
	Gid       string    `json:"gid"`
	Name      string    `json:"name"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
	Assignee  string    `json:"assignee_name"`
}

func NewAsanaAdapter() *AsanaAdapter {
	return &AsanaAdapter{
		WorkspaceID: os.Getenv("ASANA_WORKSPACE_ID"),
		APIKey:      os.Getenv("ASANA_API_KEY"),
	}
}

func (a *AsanaAdapter) Fetch() ([]AsanaTask, error) {
	url := "https://app.asana.com/api/1.0/workspaces/" + a.WorkspaceID + "/tasks?opt_fields=name,completed,created_at,assignee.name"

	req, _ := http.NewRequest("GET", url, nil)
	req.SetBasicAuth(a.APIKey, "")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Data []AsanaTask `json:"data"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	return result.Data, nil
}

func (a *AsanaAdapter) Transform(task AsanaTask) Event {
	eventType := "task_created"
	if task.Completed {
		eventType = "task_completed"
	}

	payload, _ := json.Marshal(map[string]string{
		"task_id":  task.Gid,
		"name":     task.Name,
		"assignee": task.Assignee,
	})

	return Event{
		SourceType: "pm",
		EventType:  eventType,
		TeamID:     os.Getenv("TEAM_ID"),
		Payload:    string(payload),
		OccurredAt: task.CreatedAt,
	}
}
