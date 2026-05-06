import React from "react";
import {
  useDeployFrequency,
  useLeadTime,
  useChangeFailureRate,
  useMTTR,
} from "../../hooks/useMetricsData";
import { StatCard, Widget, InlineInsight, SH } from "../../components/ui";
import { AreaChart, BarChart, Gauge } from "../../components/charts";
import { makeTimeSeries } from "../../utils/seeds";
import { useTweaks } from "../../context/TweaksContext";

const weekLabels = Array.from({ length: 30 }, (_, i) =>
  i % 5 === 0 ? `W${Math.floor(i / 7) + 1}` : "",
);

export const CTODashboard = () => {
  const { data: deployFreq } = useDeployFrequency("30d");
  const { data: leadTime } = useLeadTime("30d");
  const { data: cfr } = useChangeFailureRate("30d");
  const { data: mttr } = useMTTR("30d");

  // Static data for team velocity (можно позже вынести в API)
  const velocityByTeam = {
    labels: ["Platform", "Mobile", "Backend", "Frontend", "Data"],
    values: [84, 71, 92, 63, 55],
  };
  const prevVelocity = [76, 68, 88, 70, 48];

  // Последние значения
  const lastDeploy = deployFreq.length
    ? deployFreq[deployFreq.length - 1].toFixed(1)
    : "4.2";
  const lastLead = leadTime.length
    ? leadTime[leadTime.length - 1].toFixed(1)
    : "2.1";
  const lastCFR = cfr.length ? cfr[cfr.length - 1].toFixed(1) : "3.2";
  const lastMTTR = mttr.length ? mttr[mttr.length - 1].toFixed(0) : "18";

  const { tweaks } = useTweaks();
  const gridGap = { compact: 12, comfortable: 16, spacious: 24 }[tweaks.density];
  const padding = {
    compact: "16px 20px",
    comfortable: "24px 28px",
    spacious: "32px 36px",
  }[tweaks.density];

  return (
    <div
      style={{
        padding,
        gap: gridGap,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
      }}
    >
      {/* 4 StatCard’а */}
      <StatCard
        icon="trendingUp"
        label="Engineering Health"
        value="84"
        sub="out of 100"
        trend="+3 pts"
        trendDir="up"
        color="cyan"
        spark={makeTimeSeries(12, 78, 5, 0.5, 1)}
        delay={0}
      />
      <StatCard
        icon="zap"
        label="Deploy Frequency"
        value={`${lastDeploy}/day`}
        trend="+0.8"
        trendDir="up"
        color="success"
        spark={deployFreq.slice(-12)}
        delay={1}
      />
      <StatCard
        icon="clock"
        label="Lead Time"
        value={`${lastLead} days`}
        trend="−0.4d"
        trendDir="up"
        color="purple"
        spark={leadTime.slice(-12)}
        delay={2}
      />
      <StatCard
        icon="xCircle"
        label="Change Failure Rate"
        value={`${lastCFR}%`}
        trend="−1.1%"
        trendDir="up"
        color="warning"
        spark={cfr.slice(-12)}
        delay={3}
      />

      {/* Gauge Health Score */}
      <div className="fade-up-1" style={{ gridColumn: "span 1" }}>
        <Widget>
          <div style={{ textAlign: "center", paddingTop: 6 }}>
            <Gauge value={0.84} label="Health Score" size={150} />
          </div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {[
              { k: "Velocity", v: "92%", good: true },
              { k: "Quality", v: "96.8%", good: true },
              { k: "Reliability", v: "99.7%", good: true },
              { k: "Security", v: "78%", good: false },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "4px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--muted)" }}>{r.k}</span>
                <span
                  style={{
                    color: r.good ? "#00C853" : "#FF9100",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        </Widget>
      </div>

      {/* Deploy Frequency Chart */}
      <div className="fade-up-2" style={{ gridColumn: "span 3" }}>
        <Widget>
          <SH title="Deployment Frequency" right="Last 30 days" />
          <AreaChart
            data={deployFreq}
            labels={weekLabels}
            color={tweaks.accentColor}
            height={150}
          />
        </Widget>
      </div>

      {/* Team Velocity Chart */}
      <div className="fade-up-3" style={{ gridColumn: "span 2" }}>
        <Widget>
          <SH title="Team Velocity" right="Sprint vs prev sprint" />
          <BarChart
            labels={velocityByTeam.labels}
            values={velocityByTeam.values}
            compare={prevVelocity}
            height={160}
            color={tweaks.accentColor}
            compareColor="var(--purple)"
          />
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "#00E5FF",
                }}
              />{" "}
              This sprint
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: "#B44CFF",
                  opacity: 0.6,
                }}
              />{" "}
              Previous sprint
            </div>
          </div>
        </Widget>
      </div>

      {/* Lead Time Chart */}
      <div className="fade-up-4" style={{ gridColumn: "span 2" }}>
        <Widget>
          <SH title="Lead Time for Changes" right="Days, 30-day trend" />
          <AreaChart
            data={leadTime}
            compare={makeTimeSeries(30, 22, 8, 0, 99)}
            labels={weekLabels}
            color={tweaks.accentColor}
            height={150}
          />
        </Widget>
      </div>

      {/* AI Insight */}
      <div className="fade-up-5" style={{ gridColumn: "span 4" }}>
        <InlineInsight
          text="Security score at 78% is the main drag on engineering health. 3 critical CVEs in dependencies remain unpatched across the Backend team repos (introduced 12 days ago). Addressing these would push overall health to ~89."
          action="View security report"
        />
      </div>
    </div>
  );
};

