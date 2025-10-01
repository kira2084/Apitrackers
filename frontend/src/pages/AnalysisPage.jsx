import { useState, useEffect } from "react";
import "./AnalysisPage.css";
const AnalysisPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/metric");
        const resdata = await res.json();
        if (!resdata || Object.keys(resdata).length === 0) {
          setData({
            uptime: 0,
            avgResponseTime: 0,
            totalRequestVolume: 0,
            errorRate: 0,
            mostFrequentErrorCode: "N/A",
          });
        } else {
          setData(resdata);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/graph");
        const data = await res.json();

        //const uptimeData = data.uptimeData ?? fallback.uptimeData;
        const uptimeData =
          data?.uptimeData && data.uptimeData.length > 0
            ? data.uptimeData
            : [{ time: new Date().toISOString(), uptime: 0 }];

        const monthlyData = {};
        uptimeData.forEach((item) => {
          const date = new Date(item.time);
          const monthKey =
            date.toLocaleString("default", { month: "short" }) +
            "-" +
            date.getFullYear();

          if (!monthlyData[monthKey]) monthlyData[monthKey] = [];
          monthlyData[monthKey].push(item);
        });

        const months = Object.keys(monthlyData);

        let transformed = [];

        if (months.length > 1) {
          transformed = months
            .sort((a, b) => new Date(a) - new Date(b))
            .map((month) => {
              const uptimes = monthlyData[month].map((d) => d.uptime);
              const avgUptime =
                uptimes.reduce((a, b) => a + b, 0) / uptimes.length;
              return { label: month, value: avgUptime };
            });
        } else {
          const onlyMonth = months[0];
          const dailyData = {};

          monthlyData[onlyMonth].forEach((item) => {
            const date = new Date(item.time);

            const dayKey = date.toISOString().split("T")[0];

            if (!dailyData[dayKey]) dailyData[dayKey] = [];
            dailyData[dayKey].push(item.uptime);
          });

          transformed = Object.keys(dailyData)
            .sort((a, b) => new Date(a) - new Date(b))
            .map((day) => {
              const uptimes = dailyData[day];
              const avgUptime =
                uptimes.reduce((a, b) => a + b, 0) / uptimes.length;
              return { label: day, value: avgUptime };
            });
        }
        setChartData(transformed);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartData([{ label: "No Data", value: 0 }]);
      }
    };

    fetchData();
  }, []);

  if (loading || chartData.length === 0) return <p>Loading...</p>;
  const maxValue = Math.max(...chartData.map((d) => d.value));
  return (
    <div className="dashboarda">
      <div className="headerA">
        <h3>Analysis</h3>
      </div>

      <div className="metrics-container">
        <div className="metric-box">
          <div className="metric-label">Uptime (Last 7 Days)</div>
          <div
            className="circle-progress"
            style={{ "--progress": data.uptime, "--circle-color": "#00ff88" }}
          >
            <div className="circle-inner">
              <span className="metric-icon">😊</span>
            </div>
          </div>
          <div className="metric-value">{data.uptime.toFixed(1)}%</div>

          <div className="metric-sublabel">
            <div className="time">Last downtime:</div>
            {new Date(data.latestErrorTimestamp)
              .toLocaleString("en-US", {
                month: "short",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
              .replace("/", "-")}
          </div>
        </div>

        <div className="metric-box">
          <div
            className="circle-progress"
            style={{
              "--progress": data.avgResponseTime,
              "--circle-color": "#00aaff",
            }}
          >
            <div className="circle-inner">
              <div className="metric-value-large">
                {Math.round(data.avgResponseTime)} ms
              </div>
            </div>
          </div>
          <div className="metric-label">Average Response Time</div>
          <div className="metric-sublabel">Peak latency: {data.peak} ms</div>
        </div>

        {/* Request Volume Box */}
        <div className="metric-box">
          <div
            className="circle-progress"
            style={{
              "--progress": data.totalRequestVolume,
              "--circle-color": "#ffdd00",
            }}
          >
            <div className="circle-inner">
              <div className="metric-value-large">
                {data.totalRequestVolume}
              </div>
            </div>
          </div>
          <div className="metric-label">Request Volume</div>
          <div className="metric-sublabel">
            Avg/day:{Math.round(data.avgPerDay)}
          </div>
        </div>

        {/* Error Rate Box */}
        <div className="metric-box">
          <div
            className="circle-progress"
            style={{
              "--progress": data.errorRate,
              "--circle-color": "#ff4444",
            }}
          >
            <div className="circle-inner">
              <div className="metric-value-large">
                {data.errorRate.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="metric-label">Error Rate</div>
          <div className="metric-sublabel">
            Most common error: {data.mostFrequentErrorCode}
          </div>
        </div>
      </div>

      {/* Sales Overview Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Sales overview</h3>
          {chartData.length > 2 ? (
            <span className="chart-subtitle">(+2) more in 2025</span>
          ) : (
            <div></div>
          )}
        </div>

        <div className="chart">
          <div className="chart-y-axis">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>

          <div className="chart-area">
            <svg viewBox="0 0 800 300" className="chart-svg">
              <defs>
                <linearGradient
                  id="gradient1"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              <path
                d={`M 0,${
                  300 - (chartData[0].value / maxValue) * 250
                } ${chartData
                  .map(
                    (point, index) =>
                      `L ${(index * 800) / (chartData.length - 1)},${
                        300 - (point.value / maxValue) * 250
                      }`
                  )
                  .join(" ")} L 800,300 L 0,300 Z`}
                fill="url(#gradient1)"
                stroke="#00D4FF"
                strokeWidth="2"
              />
            </svg>

            <div className="chart-x-axis">
              {chartData ? (
                chartData.map((point, index) => (
                  <span key={index}>{point.label}</span>
                ))
              ) : (
                <div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
