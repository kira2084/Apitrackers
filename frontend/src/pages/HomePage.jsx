import { useState, useEffect } from "react";
import "./HomePage.css";
const HomePage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch API data from backend
  useEffect(() => {
    fetchApiData();
  }, [currentDate]);

  const fetchApiData = async () => {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Use query params (correct way)
      const response = await fetch(
        `http://localhost:3000/api/all?year=${year}&month=${month}`
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      // Process the data
      const processedData = processApiData(data);
      setApiData(processedData);
      console.log(processedData);
    } catch (error) {
      console.error("Error fetching API data:", error);
      setApiData([]);
    } finally {
      setLoading(false);
    }
  };

  const processApiData = (rawData) => {
    // Group by API path
    // const groupedApis = rawData.reduce((acc, item) => {
    //   const apiName = item.path || "Unknown API";
    //   if (!acc[apiName]) acc[apiName] = [];

    //   acc[apiName].push({
    //     ...item,
    //     timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    //     statusCode: item.status ? Number(item.status) : 200,
    //   });

    //   return acc;
    // }, {});
    const groupedApis = rawData.reduce((acc, item) => {
      const apiName = item.path || "Unknown API";
      const apiKey = item.apiKey || "Unknown Key";

      // Composite key => "apiKey|apiName"
      const groupKey = `${apiKey}::${apiName}`;

      if (!acc[groupKey]) acc[groupKey] = [];

      acc[groupKey].push({
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
        statusCode: item.status ? Number(item.status) : 200,
      });

      return acc;
    }, {});
    // const groupedApis = rawData.reduce((acc, item) => {
    //   const apiName = item.path || "Unknown API";
    //   const apiKey = item.apiKey || "Unknown Key";

    //   // Hidden composite key
    //   const groupKey = `${apiKey}::${apiName}`;

    //   if (!acc[groupKey]) {
    //     acc[groupKey] = {
    //       apiName, // only keep path for display
    //       data: [],
    //     };
    //   }

    //   acc[groupKey].data.push({
    //     ...item,
    //     timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    //     statusCode: item.status ? Number(item.status) : 200,
    //   });

    //   return acc;
    // }, {});
    //console.log(groupedApis);
    return Object.entries(groupedApis).map(([apiName, calls], index) => {
      // Sort by timestamp latest first
      calls.sort((a, b) => b.timestamp - a.timestamp);

      // Generate monthly status boxes
      const monthlyStatus = generateMonthlyStatus(calls, currentDate);

      // Latest call determines health
      const latestCall = calls[0];
      const isHealthy =
        latestCall &&
        latestCall.statusCode >= 200 &&
        latestCall.statusCode < 300;
      console.log(apiName);
      return {
        id: index + 1,
        name: formatApiName(apiName),
        isHealthy,
        latestStatusCode: latestCall?.statusCode || 200,
        monthlyStatus,
        calls,
      };
    });
  };

  const formatApiName = (apiPath) => {
    if (!apiPath) return "Unknown API";

    if (apiPath.includes("::")) {
      apiPath = apiPath.split("::")[1];
    }

    // Remove leading slash and convert to readable format
    let cleanPath = apiPath.startsWith("/") ? apiPath.substring(1) : apiPath;

    // Replace slashes with dashes and capitalize
    cleanPath = cleanPath.replace(/\//g, "-");

    // Capitalize first letter of each part
    return cleanPath
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-");
  };

  const generateMonthlyStatus = (calls, date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const dailyCalls = calls
      .filter((call) => {
        const callDate = new Date(call.timestamp);
        return callDate.getFullYear() === year && callDate.getMonth() === month;
      })
      .map((call) => {
        let style = "green";
        const status = call.statusCode;

        if (status >= 100 && status < 200) style = "yellow";
        else if (status >= 200 && status < 300) style = "green";
        else if (status >= 300 && status < 400) style = "orange";
        else if (status >= 400) style = "red";

        return {
          status: style,
          statusCode: status,
          timestamp: new Date(call.timestamp),
          callId: `${call.timestamp}-${Math.random()}`,
        };
      });

    // Old → new order
    return dailyCalls.sort((a, b) => a.timestamp - b.timestamp);
  };

  const generateRandomStatus = () => {
    const days = generateDaysForMonth(currentDate);
    return days.map(() => {
      const rand = Math.random();
      if (rand < 0.8) return "green";
      if (rand < 0.9) return "orange";
      if (rand < 0.97) return "yellow";
      return "red";
    });
  };

  const generateDaysForMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
    // fetchApiData will be called automatically due to useEffect dependency
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen text-white p-5 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #0f0f23 100%)",
        }}
      >
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  const days = generateDaysForMonth(currentDate);

  return (
    <div className="dashboard-container1">
      <div className="dashboard-wrapper">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Home</h1>
        </div>

        {/* System Status Panel */}
        <div className="status-panel">
          {/* Panel Header */}
          <div className="panel-header">
            <div className="status-title">System status</div>
            <div className="navigation-controls">
              <button onClick={() => navigateMonth(-1)} className="nav-button">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div className="month-display">{formatMonth(currentDate)}</div>
              <button onClick={() => navigateMonth(1)} className="nav-button">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* API Services */}
          <div className="api-services">
            {apiData.length === 0 ? (
              <div className="status-title">
                No API data available.For this month.
              </div>
            ) : (
              apiData.map((service) => (
                <div key={service.id} className="api-service">
                  <div className="service-header">
                    <div className="service-info">
                      <span className="service-id">{service.id}</span>
                      <span className="service-name">{service.name}</span>
                    </div>
                    <div className="service-status">
                      <div className="status-icon">
                        {service.latestStatusCode >= 200 &&
                        service.latestStatusCode < 300 ? (
                          // ✅ Green circle with checkmark
                          <svg
                            className="status-icon healthy"
                            viewBox="0 0 20 20"
                            width="40"
                            height="40"
                          >
                            <circle cx="10" cy="10" r="10" fill="green" />
                            <path
                              fill="black"
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : service.latestStatusCode >= 300 &&
                          service.latestStatusCode < 400 ? (
                          // 🟠 Orange circle
                          <svg
                            className="status-icon redirect"
                            viewBox="0 0 20 20"
                            width="40"
                            height="40"
                          >
                            <circle cx="10" cy="10" r="10" fill="orange" />
                          </svg>
                        ) : service.latestStatusCode >= 100 &&
                          service.latestStatusCode < 200 ? (
                          // 🟡 Yellow triangle with !
                          <svg
                            className="status-icon info"
                            viewBox="0 0 24 24"
                            width="40"
                            height="40"
                            fill="yellow"
                          >
                            <path
                              d="M12 2L2 22h20L12 2z"
                              stroke="black"
                              strokeWidth="2"
                            />
                            <line
                              x1="12"
                              y1="8"
                              x2="12"
                              y2="14"
                              stroke="black"
                              strokeWidth="2"
                            />
                            <circle cx="12" cy="18" r="1.5" fill="black" />
                          </svg>
                        ) : (
                          // ❌ Red cross
                          <svg
                            className="status-icon unhealthy"
                            viewBox="0 0 20 20"
                            width="40"
                            height="40"
                            fill="red"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="status-dots-container">
                    <div className="status-dots-wrapper">
                      {service.monthlyStatus?.map((call) => (
                        <div
                          key={call.callId}
                          className="status-dot"
                          title={`Status: ${
                            call.statusCode
                          } at ${call.timestamp.toLocaleTimeString()}`}
                        >
                          {call.status === "red" ? (
                            <div className="status-line red"></div>
                          ) : (
                            <div
                              className={`status-indicator ${call.status}`}
                            ></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
