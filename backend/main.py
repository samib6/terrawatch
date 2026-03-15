from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import json
import os
from datetime import datetime

app = FastAPI(title="TerraWatch API", description="Climate Risk Assessment API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data for cities with risk information
CITIES_DATA = [
    {
        "id": 1,
        "city": "New York City",
        "lat": 40.7128,
        "lng": -74.0060,
        "type": "Flood",
        "description": "Heavy flooding in New York City",
        "base_risk": 0.8
    },
    {
        "id": 2,
        "city": "Los Angeles",
        "lat": 34.0522,
        "lng": -118.2437,
        "type": "Heatwave",
        "description": "Extreme heatwave in Los Angeles",
        "base_risk": 0.2
    },
    {
        "id": 3,
        "city": "London",
        "lat": 51.5074,
        "lng": -0.1278,
        "type": "Coastal Erosion",
        "description": "Coastal erosion in London",
        "base_risk": 0.5
    },
    {
        "id": 4,
        "city": "Sydney",
        "lat": -33.8688,
        "lng": 151.2093,
        "type": "Wildfire",
        "description": "Wildfire risk in Sydney",
        "base_risk": 0.7
    },
    {
        "id": 5,
        "city": "Mumbai",
        "lat": 19.0760,
        "lng": 72.8777,
        "type": "Flood",
        "description": "Flooding in Mumbai",
        "base_risk": 0.9
    },
    {
        "id": 6,
        "city": "Lagos",
        "lat": 6.5244,
        "lng": 3.3792,
        "type": "Heatwave",
        "description": "Heatwave in Lagos",
        "base_risk": 0.6
    },
    {
        "id": 7,
        "city": "Miami",
        "lat": 25.7617,
        "lng": -80.1918,
        "type": "Hurricane",
        "description": "Hurricane risk in Miami",
        "base_risk": 0.7
    },
    {
        "id": 8,
        "city": "Jakarta",
        "lat": -6.2088,
        "lng": 106.8456,
        "type": "Flood",
        "description": "Flooding in Jakarta",
        "base_risk": 0.8
    }
]

def calculate_risk_for_year(base_risk: float, year: int) -> float:
    """Calculate risk for a specific year based on climate projections"""
    current_year = 2024
    years_diff = year - current_year

    # Risk increases over time due to climate change
    risk_multiplier = 1 + (years_diff * 0.02)  # 2% increase per year
    calculated_risk = min(base_risk * risk_multiplier, 1.0)

    return round(calculated_risk, 2)

@app.get("/")
async def root():
    return {"message": "TerraWatch Climate Risk API", "version": "1.0.0"}

@app.get("/api/risk")
async def get_risk_data(year: int = 2024):
    """Get risk data for all cities for a specific year"""
    if year < 2024 or year > 2050:
        raise HTTPException(status_code=400, detail="Year must be between 2024 and 2050")

    risk_data = []
    for city in CITIES_DATA:
        risk = calculate_risk_for_year(city["base_risk"], year)
        risk_data.append({
            "id": city["id"],
            "city": city["city"],
            "lat": city["lat"],
            "lng": city["lng"],
            "type": city["type"],
            "description": city["description"],
            "risk": risk
        })

    return risk_data

@app.get("/api/search")
async def search_city(q: str):
    """Search for a city by name"""
    query = q.lower().strip()

    # Search for exact matches first
    for city in CITIES_DATA:
        if city["city"].lower() == query:
            return {
                "id": city["id"],
                "city": city["city"],
                "lat": city["lat"],
                "lng": city["lng"],
                "type": city["type"],
                "description": city["description"],
                "risk": calculate_risk_for_year(city["base_risk"], 2024)
            }

    # If no exact match, return error
    raise HTTPException(status_code=404, detail=f"City '{q}' not found")

@app.get("/api/narrate")
async def get_narration(city: str, year: int = 2024):
    """Get AI narration for a city's climate risk"""
    if year < 2024 or year > 2050:
        raise HTTPException(status_code=400, detail="Year must be between 2024 and 2050")

    # Find the city
    city_data = None
    for c in CITIES_DATA:
        if c["city"].lower() == city.lower():
            city_data = c
            break

    if not city_data:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    risk = calculate_risk_for_year(city_data["base_risk"], year)

    # Generate AI narration based on risk level
    if risk < 0.3:
        narration = f"{city} currently faces low {city_data['type'].lower()} risk. However, climate projections for {year} indicate that without mitigation efforts, this risk could increase significantly. The city should continue monitoring and implement preventive measures to maintain this low-risk status."
    elif risk < 0.6:
        narration = f"{city} experiences moderate {city_data['type'].lower()} risk, with climate change projections for {year} suggesting increased frequency and intensity of events. The city should prioritize infrastructure improvements and community preparedness programs to address this growing threat."
    else:
        narration = f"{city} faces high {city_data['type'].lower()} risk, with {year} projections indicating severe impacts from climate change. Immediate action is required including large-scale infrastructure upgrades, comprehensive emergency planning, and significant investment in climate adaptation measures to protect residents and property."

    return {"narration": narration}

@app.get("/api/insurance")
async def get_insurance_data(city: str, year: int = 2024):
    """Get insurance-related data for a city"""
    if year < 2024 or year > 2050:
        raise HTTPException(status_code=400, detail="Year must be between 2024 and 2050")

    # Find the city
    city_data = None
    for c in CITIES_DATA:
        if c["city"].lower() == city.lower():
            city_data = c
            break

    if not city_data:
        raise HTTPException(status_code=404, detail=f"City '{city}' not found")

    risk = calculate_risk_for_year(city_data["base_risk"], year)

    # Calculate insurance metrics
    flood_percent = int(risk * 100)
    heat_percent = int((1 - risk) * 100)

    # Estimate damage based on risk and city characteristics
    base_damage = 1000000000  # 1 billion base
    damage_multiplier = risk * 2  # Higher risk = more damage
    damage = int(base_damage * damage_multiplier)

    # Premium change based on risk
    premium_increase = int(risk * 50)  # Up to 50% increase

    return {
        "floodPercent": flood_percent,
        "heatPercent": heat_percent,
        "damage": f"${damage:,}M",
        "premiumChange": f"{premium_increase}% increase"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)