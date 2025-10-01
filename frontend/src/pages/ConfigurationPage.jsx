import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import "./ConfigurationPage.css";
const ConfigurationPage = () => {
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [selectedApi, setSelectedApi] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [notification, setNotification] = useState(null);
  const [controls, setControls] = useState({
    api: false,
    tracer: true,
    limit: false,
    scheduleOnOff: false,
    startTime: { hours: "00", minutes: "00", seconds: "00" },
    endTime: { hours: "00", minutes: "00", seconds: "00" },
    limitValue: 0,
    rateUnit: "second",
  });

  // Fetch API list on mount
  useEffect(() => {
    const fetchApiData = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:3000/api/unique-routes");
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        console.error("Error fetching API data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApiData();
  }, []);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000); // auto hide after 3s
  };

  // Map backend config to UI controls
  const mapConfigToControls = (config) => ({
    api: config?.apiEnabled ?? false,
    tracer: config?.tracer ?? true,
    limit: config?.requestLimit?.enabled ?? false,
    scheduleOnOff: config?.scheduling?.enabled ?? false,
    startTime: {
      hours: config?.scheduling?.startTime?.split(":")[0] ?? "00",
      minutes: config?.scheduling?.startTime?.split(":")[1] ?? "00",
      seconds: "00",
    },
    endTime: {
      hours: config?.scheduling?.endTime?.split(":")[0] ?? "23",
      minutes: config?.scheduling?.endTime?.split(":")[1] ?? "59",
      seconds: "00",
    },
    limitValue: config?.requestLimit?.maxRequests ?? 1,
    rateUnit: mapRateUnit(config?.requestLimit?.rate),
  });

  const mapRateUnit = (rate) => {
    switch (rate) {
      case "sec":
        return "second";
      case "min":
        return "minute";
      case "hour":
        return "hour";
      case "day":
        return "day";
      default:
        return "second";
    }
  };

  // Map UI controls back to backend config
  const mapControlsToConfig = (controls) => ({
    apiEnabled: controls.api,
    tracer: controls.tracer,
    requestLimit: {
      enabled: controls.limit,
      maxRequests: controls.limitValue,
      rate:
        controls.rateUnit === "second"
          ? "sec"
          : controls.rateUnit === "minute"
          ? "min"
          : controls.rateUnit === "hour"
          ? "hour"
          : "day",
    },
    scheduling: {
      enabled: controls.scheduleOnOff,
      startTime: `${controls.startTime.hours}:${controls.startTime.minutes}:${controls.startTime.seconds}`,
      endTime: `${controls.endTime.hours}:${controls.endTime.minutes}:${controls.endTime.seconds}`,
    },
  });

  const handleMoreClick = async (api, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const modalHeight = 400;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top, left;

    // Check if there's enough space below the button
    if (spaceBelow >= modalHeight) {
      // Position below the button
      top = rect.bottom + 5;
    } else if (spaceAbove >= modalHeight) {
      // Position above the button
      top = rect.top - modalHeight - 100;
    } else {
      // Center vertically if neither position has enough space
      top = Math.max(10, (viewportHeight - modalHeight) / 2);
    }

    // For horizontal positioning, keep it similar but add boundary checks
    left = Math.min(rect.left - 400, window.innerWidth - 320 - 20); // 320 is modal width + padding
    left = Math.max(20, left); // Don't go too close to left edge

    setModalPosition({ top, left });
    setSelectedApi(api);
    setShowControlsModal(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/setconfig/${api.apiKey}?path=${api.apiName}`
      );
      const config = await response.json();
      //console.log(config);
      setControls(mapConfigToControls(config));
    } catch (err) {
      console.error("Error fetching config:", err);
      setControls({
        api: true,
        tracer: true,
        limit: true,
        scheduleOnOff: false,
        startTime: { hours: "00", minutes: "00", seconds: "00" },
        endTime: { hours: "23", minutes: "59", seconds: "59" },
        limitValue: 1,
        rateUnit: "second",
      });
    }

    setShowControlsModal(true);
  };

  const handleToggle = (field) => {
    //console.log(field);
    setControls((prev) => ({ ...prev, [field]: !prev[field] }));
    showNotification(` ${field} ${controls[field] ? "disabled" : "enabled"}`);
  };

  const handleTimeChange = (timeType, unit, value) => {
    setControls((prev) => ({
      ...prev,
      [timeType]: {
        ...prev[timeType],
        [unit]: value,
      },
    }));
  };

  const handleLimitChange = (value) => {
    const numValue = Math.min(Math.max(1, parseInt(value) || 1), 10);
    setControls((prev) => ({ ...prev, limitValue: numValue }));
  };

  const handleSaveControls = async () => {
    if (!selectedApi) return;

    const payload = {
      apiKey: selectedApi.apiKey,
      path: selectedApi.apiName,
      ...mapControlsToConfig(controls),
    };

    try {
      const response = await fetch("http://localhost:3000/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      //console.log("Config saved:", data);
      showNotification("Configuration saved successfully ✅");
    } catch (err) {
      console.error("Error saving config:", err);
      showNotification("Failed to save configuration ❌");
    }

    setShowControlsModal(false);
  };

  const closeModal = () => {
    setShowControlsModal(false);
    setSelectedApi(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-white">
        Loading API data...
      </div>
    );
  }

  // ... your hooks and logic stay the same ...

  if (loading) {
    return <div className="loading-container">Loading API data...</div>;
  }

  return (
    <div className="container">
      <h1 className="title">API List</h1>

      <div className="api-list-container">
        <div className="header">
          <div className="header-grid">
            <div className="header-left">
              <div>API Name</div>
              <div>Start Date</div>
            </div>
          </div>
        </div>

        <div>
          {apiData.map((api, index) => (
            <div key={`${api.apiKey}-${index}`} className="api-item">
              <div className="api-item-grid">
                <div className="api-left-content">
                  <div className="api-name">{api.apiName}</div>
                  <div className="api-date">
                    {new Date(api.startDate).toLocaleDateString("en-CA")}
                  </div>
                </div>
                <div>
                  <button
                    onClick={(e) => handleMoreClick(api, e)}
                    className="more-button"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showControlsModal && (
        <>
          <div className="modal-overlay" onClick={closeModal}></div>
          <div
            className="modal"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
            }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Controls</h2>
            </div>

            <div className="modal-content">
              {/* Toggle Controls */}
              <div className="toggle-controls">
                {[
                  { key: "api", label: "API" },
                  { key: "tracer", label: "Tracer" },
                  { key: "limit", label: "Limit" },
                  { key: "scheduleOnOff", label: "Schedule On/Off" },
                ].map(({ key, label }) => (
                  <div key={key} className="toggle-item">
                    <span className="toggle-label">{label}</span>
                    <button
                      onClick={() => handleToggle(key)}
                      className={`toggle-switch ${
                        controls[key] ? "active" : "inactive"
                      }`}
                    >
                      <span
                        className={`toggle-circle ${
                          controls[key] ? "active" : "inactive"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Limit Controls */}
              {controls.limit && (
                <div className="limit-section">
                  <div className="limit-item">
                    <span className="toggle-label">Number of requests:</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={controls.limitValue}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      className="input limit-input"
                    />
                  </div>
                  <div className="limit-item">
                    <span className="toggle-label">Rate:</span>
                    <select
                      value={controls.rateUnit}
                      onChange={(e) =>
                        setControls((prev) => ({
                          ...prev,
                          rateUnit: e.target.value,
                        }))
                      }
                      className="select"
                    >
                      <option value="second">sec</option>
                      <option value="minute">min</option>
                      <option value="hour">hrs</option>
                    </select>
                  </div>
                </div>
              )}
              {/* Schedule Controls */}
              {controls.scheduleOnOff && (
                <div className="limit-section">
                  {["startTime", "endTime"].map((timeType) => (
                    <div key={timeType} className="time-show">
                      <label className="time-label">
                        {timeType === "startTime" ? "Start Time:" : "End Time:"}
                      </label>
                      <div className="time-inputs">
                        {["hours", "minutes", "seconds"].map((unit, idx) => (
                          <div key={unit} className="time-input-group">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              value={controls[timeType][unit]}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ""); // allow only digits
                                handleTimeChange(timeType, unit, val);
                              }}
                              onBlur={(e) => {
                                let val = e.target.value.replace(/\D/g, "");
                                if (val === "") val = "00";

                                // clamp valid ranges
                                if (unit === "hours" && parseInt(val) > 23)
                                  val = "23";
                                if (
                                  (unit === "minutes" || unit === "seconds") &&
                                  parseInt(val) > 59
                                )
                                  val = "59";

                                val = val.padStart(2, "0");
                                handleTimeChange(timeType, unit, val);

                                // ✅ check start < end
                                if (timeType === "startTime") {
                                  const startSec = parseInt(
                                    `${controls.startTime.hours || "00"}${
                                      controls.startTime.minutes || "00"
                                    }${controls.startTime.seconds || "00"}`
                                  );
                                  const endSec = parseInt(
                                    `${controls.endTime.hours || "23"}${
                                      controls.endTime.minutes || "59"
                                    }${controls.endTime.seconds || "59"}`
                                  );

                                  if (startSec >= endSec) {
                                    alert(
                                      "Start time must be less than End time"
                                    );
                                    // Reset to safe default
                                    handleTimeChange(
                                      "startTime",
                                      "hours",
                                      "00"
                                    );
                                    handleTimeChange(
                                      "startTime",
                                      "minutes",
                                      "00"
                                    );
                                    handleTimeChange(
                                      "startTime",
                                      "seconds",
                                      "00"
                                    );
                                  }
                                }
                              }}
                              className="time-input"
                            />

                            {idx < 2 && (
                              <span className="time-separator">:</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleSaveControls} className="save-button">
                Save
              </button>
            </div>
          </div>
        </>
      )}
      {notification && <div className="notification">{notification}</div>}
    </div>
  );
};

export default ConfigurationPage;
