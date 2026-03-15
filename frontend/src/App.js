import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import config from './config';

// Map controller component to handle flyTo
function MapController({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo.center, flyTo.zoom);
    }
  }, [flyTo, map]);
  return null;
}

function App() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [debouncedYear, setDebouncedYear] = useState(2024);
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedCity, setSearchedCity] = useState(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCityRiskData, setSelectedCityRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [narration, setNarration] = useState(null);
  const [insurance, setInsurance] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [backendError, setBackendError] = useState(false);

  // Debounce year selection
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedYear(selectedYear), 300);
    return () => clearTimeout(timer);
  }, [selectedYear]);

  // Fetch all cities when year changes
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${config.API_BASE}/api/cities?year=${debouncedYear}`);
        setCities(response.data);
        setBackendError(false);
      } catch (error) {
        console.error('Failed to fetch cities:', error);
        setCities([]);
        setBackendError(true);
      }
    };
    fetchCities();
  }, [debouncedYear]);

  // Fetch real-time risk analysis and AI analysis for selected city - THIS UPDATES WHEN YEAR CHANGES
  useEffect(() => {
    if (!selectedCity) {
      setSelectedCityRiskData(null);
      setNarration(null);
      setInsurance(null);
      return;
    }

    const fetchCityData = async () => {
      setLoading(true);
      try {
        // Fetch comprehensive real-time analysis (includes trends and AI insights)
        const realtimeResponse = await axios.get(
          `${config.API_BASE}/api/realtime-analysis?lat=${selectedCity.lat}&lng=${selectedCity.lng}&year=${debouncedYear}&city=${encodeURIComponent(selectedCity.city)}`
        );
        
        // Extract current risks for display
        const realtimeData = realtimeResponse.data;
        setSelectedCityRiskData({
          ...realtimeData.current_risks,
          latitude: selectedCity.lat,
          longitude: selectedCity.lng,
          city: realtimeData.location.city,
          trends: realtimeData.risk_trends
        });
        
        // Set narration from AI insights
        setNarration(realtimeData.ai_insights);
        
        // Fetch insurance data separately
        const insuranceResponse = await axios.get(
          `${config.API_BASE}/api/insurance?city=${encodeURIComponent(selectedCity.city)}&year=${debouncedYear}`
        );
        setInsurance(insuranceResponse.data);

        setBackendError(false);
      } catch (error) {
        console.error('Failed to fetch city data:', error);
        
        // Fallback: Try basic risk endpoint
        try {
          const riskResponse = await axios.get(
            `${config.API_BASE}/api/risk?lat=${selectedCity.lat}&lng=${selectedCity.lng}&year=${debouncedYear}`
          );
          setSelectedCityRiskData(riskResponse.data);
          setNarration({
            risk_brief: 'Climate risk data loaded (real-time analysis unavailable)',
            adaptation_actions: []
          });
        } catch {
          setSelectedCityRiskData(null);
          setNarration({
            risk_brief: 'Unable to load analysis at this time. Please ensure backend is running.',
            adaptation_actions: []
          });
          setInsurance(null);
          setBackendError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCityData();
  }, [selectedCity, debouncedYear]);

  const getColor = (risk) => {
    if (risk < 0.3) return '#22c55e';
    if (risk <= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskLevel = (risk) => {
    if (risk < 0.3) return 'Low';
    if (risk <= 0.6) return 'Medium';
    return 'High';
  };

  const handleMarkerClick = (city) => {
    setSelectedCity(city);
    setSidePanelOpen(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await axios.get(`${config.API_BASE}/api/search?q=${encodeURIComponent(searchQuery)}`);
      const results = response.data;
      if (results && results.length > 0) {
        const result = results[0]; // Take the first result
        const searchedCityData = {
          city: result.city,
          lat: result.latitude,
          lng: result.longitude,
          country: result.country
        };
        setSearchedCity(searchedCityData);
        setSelectedCity(searchedCityData);
        setSidePanelOpen(true);
        setFlyTo({ center: [result.latitude, result.longitude], zoom: 10 });
      } else {
        alert(`City "${searchQuery}" not found. Please try a different city name.`);
      }
    } catch (error) {
      console.error('Failed to search for city:', error);
      alert(`City "${searchQuery}" not found. Please try a different city name.`);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', background: '#1f2937', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🌍 TerraWatch</h1>
        <div style={{ fontSize: '0.9rem' }}>
          {cities.length} cities monitored | Viewing: {debouncedYear} | SDG 13
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' }}
          />
          <button onClick={handleSearch} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>Year: {debouncedYear}</span>
          <input
            type="range"
            min="2024"
            max="2050"
            step="1"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: '150px' }}
          />
          <button onClick={() => setSelectedYear(2024)} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>Today</button>
          <button onClick={() => setSelectedYear(2030)} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>2030</button>
          <button onClick={() => setSelectedYear(2050)} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>2050</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <MapController flyTo={flyTo} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* Display all cities */}
            {cities.map((city, index) => (
              <CircleMarker
                key={index}
                center={[city.lat, city.lng]}
                radius={15}
                color={getColor(city.climate_risk_index / 100)}
                fillColor={getColor(city.climate_risk_index / 100)}
                fillOpacity={0.7}
                weight={2}
                eventHandlers={{
                  click: () => handleMarkerClick(city),
                }}
              >
                <Tooltip>{city.city} - {getRiskLevel(city.climate_risk_index / 100)}</Tooltip>
              </CircleMarker>
            ))}
            {/* Display searched city if different */}
            {searchedCity && !cities.find(c => c.city === searchedCity.city) && (
              <CircleMarker
                center={[searchedCity.lat, searchedCity.lng]}
                radius={15}
                color="#3b82f6"
                fillColor="#3b82f6"
                fillOpacity={0.7}
                weight={3}
                eventHandlers={{
                  click: () => handleMarkerClick(searchedCity),
                }}
              >
                <Tooltip>{searchedCity.city} (Searched)</Tooltip>
              </CircleMarker>
            )}
          </MapContainer>

          {/* Backend Error Message */}
          {backendError && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#ef4444',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 1000
            }}>
              ⚠️ Backend service unavailable. Please ensure the backend server is running on port 8001.
            </div>
          )}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: '0.9rem', zIndex: 500 }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Risk Legend</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', background: '#22c55e', borderRadius: '50%' }}></div>
                <span>Low Risk (&lt;30%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', background: '#f59e0b', borderRadius: '50%' }}></div>
                <span>Medium Risk (30-60%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', background: '#ef4444', borderRadius: '50%' }}></div>
                <span>High Risk (&gt;60%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {sidePanelOpen && (
          <div style={{ width: '380px', background: 'white', borderLeft: '1px solid #ddd', padding: '20px', overflowY: 'auto', boxShadow: '-2px 0 10px rgba(0,0,0,0.1)', zIndex: 100 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{selectedCity?.city}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>{selectedCity?.country || 'Unknown'}</p>
              </div>
              <button onClick={() => setSidePanelOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite', margin: '0 auto 20px' }}></div>
                <p>Loading risk analysis for {debouncedYear}...</p>
              </div>
            ) : (
              <div>
                {/* Risk Assessment Section */}
                <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Risk Assessment ({debouncedYear})</h4>
                  
                  {selectedCityRiskData ? (
                    <>
                      {/* Flood Risk */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.95rem' }}>
                          <span style={{ fontWeight: '500' }}>Flood Risk:</span>
                          <span style={{ fontWeight: '600', color: getColor(selectedCityRiskData.flood_risk) }}>
                            {Math.round(selectedCityRiskData.flood_risk * 100)}%
                          </span>
                        </div>
                        <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            background: getColor(selectedCityRiskData.flood_risk),
                            height: '100%',
                            borderRadius: '4px',
                            width: `${Math.min(selectedCityRiskData.flood_risk * 100, 100)}%`,
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>

                      {/* Heat Risk */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.95rem' }}>
                          <span style={{ fontWeight: '500' }}>Heat Risk:</span>
                          <span style={{ fontWeight: '600', color: getColor(selectedCityRiskData.heat_risk) }}>
                            {Math.round(selectedCityRiskData.heat_risk * 100)}%
                          </span>
                        </div>
                        <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            background: getColor(selectedCityRiskData.heat_risk),
                            height: '100%',
                            borderRadius: '4px',
                            width: `${Math.min(selectedCityRiskData.heat_risk * 100, 100)}%`,
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>

                      {/* Storm Risk */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.95rem' }}>
                          <span style={{ fontWeight: '500' }}>Storm Risk:</span>
                          <span style={{ fontWeight: '600', color: getColor(selectedCityRiskData.storm_risk) }}>
                            {Math.round(selectedCityRiskData.storm_risk * 100)}%
                          </span>
                        </div>
                        <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            background: getColor(selectedCityRiskData.storm_risk),
                            height: '100%',
                            borderRadius: '4px',
                            width: `${Math.min(selectedCityRiskData.storm_risk * 100, 100)}%`,
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>

                      {/* Climate Risk Index */}
                      <div style={{ background: '#f3f4f6', padding: '10px 12px', borderRadius: '6px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>Climate Risk Index:</span>
                          <span style={{ fontWeight: '700', fontSize: '1.1rem', color: getColor(selectedCityRiskData.climate_risk_index / 100) }}>
                            {selectedCityRiskData.climate_risk_index}/100
                          </span>
                        </div>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                          Risk Level: <strong style={{ color: getColor(selectedCityRiskData.climate_risk_index / 100) }}>
                            {selectedCityRiskData.risk_level}
                          </strong>
                        </p>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: '#ef4444' }}>Risk data unavailable</p>
                  )}
                </div>

                {/* Insurance Impact Section */}
                <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Insurance Impact</h4>
                  {insurance ? (
                    <>
                      <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#666' }}>Base Premium (Annual)</p>
                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#059669' }}>
                          ${insurance.base_premium.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>

                      <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#666' }}>Adjusted Premium ({debouncedYear})</p>
                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#d97706' }}>
                          ${insurance.adjusted_premium.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </div>

                      <div style={{ background: '#f3f4f6', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>Total Multiplier:</span>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1f2937' }}>
                          {insurance.total_multiplier.toFixed(2)}x
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '12px', lineHeight: '1.4', fontStyle: 'italic' }}>
                        {insurance.explanation}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: '#ef4444' }}>Insurance data unavailable</p>
                  )}
                </div>

                {/* Risk Trends Section */}
                {selectedCityRiskData?.trends && (
                  <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>📊 Risk Trends (2024-2050)</h4>
                    
                    {/* Flood Trend */}
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Flood</span>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                          {selectedCityRiskData.trends.flood.trajectory}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '5px' }}>
                        <span style={{ minWidth: '40px' }}>2024: {Math.round(selectedCityRiskData.trends.flood.value_2024 * 100)}%</span>
                        <span style={{ minWidth: '40px' }}>2035: {Math.round(selectedCityRiskData.trends.flood.value_2035 * 100)}%</span>
                        <span style={{ minWidth: '40px' }}>2050: {Math.round(selectedCityRiskData.trends.flood.value_2050 * 100)}%</span>
                      </div>
                      <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                          background: '#3b82f6',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.flood.value_2024 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                        <div style={{
                          background: '#f59e0b',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.flood.value_2035 * 100, 100) - Math.min(selectedCityRiskData.trends.flood.value_2024 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                        <div style={{
                          background: '#ef4444',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.flood.value_2050 * 100, 100) - Math.min(selectedCityRiskData.trends.flood.value_2035 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      {selectedCityRiskData.trends.flood.years_to_critical !== null && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#ef4444', fontWeight: '500' }}>
                          ⚠️ Critical threshold in ~{selectedCityRiskData.trends.flood.years_to_critical} years
                        </p>
                      )}
                    </div>

                    {/* Heat Trend */}
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Heat</span>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                          {selectedCityRiskData.trends.heat.trajectory}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '5px' }}>
                        <span style={{ minWidth: '40px' }}>2024: {Math.round(selectedCityRiskData.trends.heat.value_2024 * 100)}%</span>
                        <span style={{ minWidth: '40px' }}>2035: {Math.round(selectedCityRiskData.trends.heat.value_2035 * 100)}%</span>
                        <span style={{ minWidth: '40px' }}>2050: {Math.round(selectedCityRiskData.trends.heat.value_2050 * 100)}%</span>
                      </div>
                      <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                          background: '#3b82f6',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.heat.value_2024 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                        <div style={{
                          background: '#f59e0b',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.heat.value_2035 * 100, 100) - Math.min(selectedCityRiskData.trends.heat.value_2024 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                        <div style={{
                          background: '#ef4444',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.heat.value_2050 * 100, 100) - Math.min(selectedCityRiskData.trends.heat.value_2035 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      {selectedCityRiskData.trends.heat.years_to_critical !== null && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#ef4444', fontWeight: '500' }}>
                          ⚠️ Critical threshold in ~{selectedCityRiskData.trends.heat.years_to_critical} years
                        </p>
                      )}
                    </div>

                    {/* Storm Trend */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Storm</span>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                          {selectedCityRiskData.trends.storm.trajectory}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '5px' }}>
                        <span style={{ minWidth: '40px' }}>2024: {Math.round(selectedCityRiskData.trends.storm.value_2024 * 100)}%</span>
                        <span style={{ minWidth: '40px' }}>2035: {Math.round(selectedCityRiskData.trends.storm.value_2035 * 100)}%</span>
                        <span style={{ minWidth: '40px' }}>2050: {Math.round(selectedCityRiskData.trends.storm.value_2050 * 100)}%</span>
                      </div>
                      <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                          background: '#3b82f6',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.storm.value_2024 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                        <div style={{
                          background: '#f59e0b',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.storm.value_2035 * 100, 100) - Math.min(selectedCityRiskData.trends.storm.value_2024 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                        <div style={{
                          background: '#ef4444',
                          height: '100%',
                          width: `${Math.min(selectedCityRiskData.trends.storm.value_2050 * 100, 100) - Math.min(selectedCityRiskData.trends.storm.value_2035 * 100, 100)}%`,
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      {selectedCityRiskData.trends.storm.years_to_critical !== null && (
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#ef4444', fontWeight: '500' }}>
                          ⚠️ Critical threshold in ~{selectedCityRiskData.trends.storm.years_to_critical} years
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Analysis Section */}
                <div>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>AI Analysis & Recommendations</h4>
                  {narration ? (
                    <>
                      <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                        <p style={{ margin: 0, lineHeight: '1.6', fontSize: '0.95rem', color: '#1e40af' }}>
                          {narration.risk_brief}
                        </p>
                      </div>

                      {narration.adaptation_actions && narration.adaptation_actions.length > 0 && (
                        <div>
                          <h5 style={{ margin: '15px 0 10px 0', color: '#1f2937', fontSize: '0.95rem' }}>🛡️ Recommended Actions:</h5>
                          <ul style={{ paddingLeft: '20px', margin: 0 }}>
                            {narration.adaptation_actions.map((action, index) => (
                              <li key={index} style={{
                                marginBottom: '8px',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                color: '#374151',
                              }}>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#ef4444' }}>Analysis unavailable</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .header { flex-direction: column; text-align: center; }
          .controls { flex-direction: column; gap: 10px; }
        }
      `}</style>
    </div>
  );
}

export default App;
