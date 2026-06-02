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

type JenkinsAdapter struct {
	URL   string
	User  string
	Token string
}

type JenkinsBuild struct {
	Number    int    `json:"number"`
	Result    string `json:"result"`
	Duration  int    `json:"duration"`
	Timestamp int64  `json:"timestamp"`
}

func NewJenkinsAdapter() *JenkinsAdapter {
	return &JenkinsAdapter{
		URL:   os.Getenv("JENKINS_URL"),
		User:  os.Getenv("JENKINS_USER"),
		Token: os.Getenv("JENKINS_TOKEN"),
	}
}

func (j *JenkinsAdapter) Fetch() ([]JenkinsBuild, error) {
	url := j.URL + "/api/json?tree=builds[number,result,duration,timestamp]"

	req, _ := http.NewRequest("GET", url, nil)
	req.SetBasicAuth(j.User, j.Token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Builds []JenkinsBuild `json:"builds"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	return result.Builds, nil
}

func (j *JenkinsAdapter) Transform(build JenkinsBuild) Event {
	eventType := "build_completed"
	if build.Result == "FAILURE" {
		eventType = "build_failed"
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"build_number": build.Number,
		"result":       build.Result,
		"duration_ms":  build.Duration,
	})

	return Event{
		SourceType: "cicd",
		EventType:  eventType,
		TeamID:     os.Getenv("TEAM_ID"),
		Payload:    string(payload),
		OccurredAt: time.Unix(build.Timestamp/1000, 0),
	}
}
