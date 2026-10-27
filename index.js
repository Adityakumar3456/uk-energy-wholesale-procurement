const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Format date to YYYY-MM-DD
const getFormattedDate = (date) => date.toISOString().split('T')[0];

/**
 * Endpoint: /api/procurement-forecast
 * Query Params: ?settlementDate=YYYY-MM-DD
 */
app.get('/api/procurement-forecast', async (req, res) => {
  try {
    // Default to yesterday or provided settlement date (settlement date needs YYYY-MM-DD)
    const targetDate = req.query.settlementDate || '2026-10-25';

    // 1. Fetch Half-Hourly Generation by Fuel Type (FUELHH)
    // Elexon BMRS endpoint provides half-hourly settlement periods 1-48
    const fuelhhUrl = `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom=${targetDate}&settlementDateTo=${targetDate}`;
    
    let fuelData = [];
    try {
      const response = await axios.get(fuelhhUrl, { timeout: 8000 });
      fuelData = response.data || [];
    } catch (apiErr) {
      console.warn('Elexon Live API unreachable or throttled, using structured fallback simulation.');
    }

    // 2. Data Processing per Settlement Period (1 to 48 periods, 30 mins each)
    const periods = [];

    for (let p = 1; p <= 48; p++) {
      // Calculate realistic time string (e.g., Period 1 = 00:00 - 00:30, Period 36 = 17:30 - 18:00)
      const totalMinutes = (p - 1) * 30;
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const mins = String(totalMinutes % 60).padStart(2, '0');
      const timeLabel = `${hours}:${mins}`;

      // Extract generation for wind/solar if API data is present
      const periodFuel = fuelData.filter((item) => item.settlementPeriod === p);
      const windGen = periodFuel.filter(item => item.fuelType === 'WIND').reduce((acc, curr) => acc + (curr.generation || 0), 0);
      const solarGen = periodFuel.filter(item => item.fuelType === 'SOLAR').reduce((acc, curr) => acc + (curr.generation || 0), 0);

      // Simulation base (MW) if specific external period is empty
      const simulatedWind = windGen || Math.round(4500 + 2500 * Math.sin(p / 5));
      const simulatedSolar = solarGen || (p >= 14 && p <= 36 ? Math.round(3000 * Math.sin(((p - 14) / 22) * Math.PI)) : 0);
      
      // Typical UK Grid consumer demand profile (Peak in evening settlement periods 34-40)
      const baseDemand = 22000;
      const peakFactor = Math.sin(((p - 10) / 38) * Math.PI);
      const simulatedDemand = Math.round(baseDemand + (peakFactor > 0 ? peakFactor * 14000 : 2000));

      const totalRenewable = simulatedWind + simulatedSolar;
      
      // Core Utility Business Logic:
      // Net Procurement = Demand - Available Renewable Supply
      const netProcurementMW = simulatedDemand - totalRenewable;
      const status = netProcurementMW > 0 ? 'DEFICIT_BUY' : 'SURPLUS_SELL';

      periods.push({
        settlementPeriod: p,
        time: timeLabel,
        demandMW: simulatedDemand,
        windMW: simulatedWind,
        solarMW: simulatedSolar,
        totalRenewableMW: totalRenewable,
        netProcurementMW: netProcurementMW,
        status: status, // DEFICIT means utility must buy from wholesale day-ahead market
      });
    }

    // 3. Aggregate KPI Metrics for Dashboard Cards
    const totalDemandMWh = Math.round(periods.reduce((acc, curr) => acc + curr.demandMW * 0.5, 0));
    const totalRenewableMWh = Math.round(periods.reduce((acc, curr) => acc + curr.totalRenewableMW * 0.5, 0));
    const totalProcurementNeededMWh = Math.round(periods.reduce((acc, curr) => acc + (curr.netProcurementMW > 0 ? curr.netProcurementMW * 0.5 : 0), 0));
    const peakDeficit = periods.reduce((max, curr) => curr.netProcurementMW > max.netProcurementMW ? curr : max, periods[0]);

    res.json({
      success: true,
      settlementDate: targetDate,
      summary: {
        totalDemandMWh,
        totalRenewableMWh,
        totalProcurementNeededMWh,
        renewableCoveragePercent: Math.round((totalRenewableMWh / totalDemandMWh) * 100),
        peakShortageTime: peakDeficit.time,
        peakShortageMW: peakDeficit.netProcurementMW,
      },
      data: periods,
    });
  } catch (error) {
    console.error('Error computing energy balance:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Gridbricks Energy Service running on http://localhost:${PORT}`);
});