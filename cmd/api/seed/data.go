// SPDX-License-Identifier: AGPL-3.0-or-later
// Metraly - Team Engineering Metrics API
// Copyright (C) 2026 Metraly Contributors

package seed

import (
	"github.com/getmetraly/metraly/cmd/api/domain"
)

var seedPlugins = []*domain.Plugin{
	{ID: "github", Name: "GitHub", Description: "Connect GitHub repositories for PR and commit metrics", Icon: "github", Category: "Source Control", Installed: true},
	{ID: "jira", Name: "Jira", Description: "Sync sprints, epics, and issue velocity from Jira", Icon: "jira", Category: "Project Management", Installed: true},
	{ID: "datadog", Name: "Datadog", Description: "Pull infrastructure and APM metrics from Datadog", Icon: "datadog", Category: "Observability", Installed: false},
	{ID: "pagerduty", Name: "PagerDuty", Description: "Import incident data and MTTR from PagerDuty", Icon: "pagerduty", Category: "Incident Management", Installed: false},
	{ID: "linear", Name: "Linear", Description: "Track engineering velocity and cycle time from Linear", Icon: "linear", Category: "Project Management", Installed: false},
	{ID: "slack", Name: "Slack", Description: "Send metric alerts and digest reports to Slack channels", Icon: "slack", Category: "Communication", Installed: false},
}

var actionPtr = func(s string) *string { return &s }

var seedInsights = []*domain.AIInsight{
	{
		ID:     "insight-1",
		Title:  "Atlas review queue is slowing PR cycle time",
		Body:   "Atlas has the slowest PR cycle time this sprint. Median first review latency is above 2 days while coding time stays within range, which points to review queue pressure rather than author throughput.",
		Action: actionPtr("Review Atlas queue"),
	},
	{
		ID:     "insight-2",
		Title:  "Comet CI failures are concentrated in tests and timeouts",
		Body:   "Comet's build failure rate increased over the last two weeks. The spike is concentrated in collector-ci test and timeout failures, which makes flaky tests the best first target.",
		Action: actionPtr("Inspect failing builds"),
	},
	{
		ID:     "insight-3",
		Title:  "Beacon release flow is improving",
		Body:   "Beacon improved deployment frequency over the last four weeks while keeping change failure low. The signal stays inside the expected range, so there is no material anomaly this week.",
		Action: actionPtr("Compare release trends"),
	},
	{
		ID:     "insight-4",
		Title:  "Atlas review-stage WIP is elevated",
		Body:   "Atlas has elevated review-stage WIP, which correlates with slower PR cycle time this sprint. Limiting new work until the review queue falls should help the flow recover.",
		Action: actionPtr("Open review queue"),
	},
	{
		ID:     "insight-5",
		Title:  "Delta incident linked to a rolled-back deployment",
		Body:   "The Delta SEV2 incident was linked to a rolled-back production deployment and recovered within the expected MTTR window. The data supports a pre-deploy validation step as the next investigation.",
		Action: actionPtr("Inspect deployment history"),
	},
	{
		ID:     "insight-6",
		Title:  "Sandbox AI ignored untrusted embedded instructions",
		Body:   "The demo dataset includes a prompt-injection trap, but Metraly should answer only from allowed engineering metrics and ignore the embedded instruction.",
		Action: actionPtr("Review AI safety case"),
	},
}

var seedTemplates = []*domain.DashboardTemplate{
	{
		ID:          "all-widgets",
		Name:        "Metraly Demo Dashboard",
		Description: "All Metraly widgets with seeded data",
		Icon:        "dashboard",
		Category:    "Demo",
		Widgets:     sandboxAllWidgets.Widgets,
		Layout:      sandboxAllWidgets.Layout,
	},
}
