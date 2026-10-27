# UK Wholesale Electricity Procurement & Imbalance Dashboard

A full-stack energy trading analytics engine built for UK energy utilities to forecast half-hourly settlement imbalances (48 periods/day) and determine day-ahead wholesale electricity procurement volumes against renewable generation intermittency.

## ⚡ Core Problem Statement
UK electricity utilities must reliably supply consumer demand while integrating weather-dependent wind and solar power. When renewable supply falls short, energy must be procured in advance from the UK day-ahead wholesale market to prevent expensive grid imbalance settlement penalties (Elexon BSC standards).

$$\text{Net Procurement (Shortage / Surplus)} = \text{Consumer Demand} - (\text{Wind Generation} + \text{Solar Generation})$$

## 🚀 Features
- **48 Settlement Periods Ingestion:** Models half-hourly settlement intervals based on Elexon BMRS standards (`FUELHH` and `WINDFOR` streams).
- **Automated Imbalance Calculation:** Computes half-hourly deficit/surplus to recommend wholesale buy actions.
- **Interactive Analytics UI:** Time-series charts (Demand vs. Renewables vs. Net Procurement) with key metrics: Total Demand (MWh), Renewable Supply (MWh), Net Wholesale Purchase Volume (MWh), and Peak Deficit Time Window.
- **Settlement Ledger:** Granular tabular audit showing half-hourly generation by fuel type and execution action status.

## 🛠 Tech Stack
- **Backend:** Node.js, Express.js, Axios, REST APIs
- **Frontend:** Vanilla JS, Chart.js, Tailwind CSS
- **Data Source Reference:** Elexon BMRS Data Portal (`FUELHH` / `WINDFOR` datasets)

## 📦 Local Setup & Installation
```bash
git clone [https://github.com/Adityakumar3456/uk-energy-wholesale-procurement.git](https://github.com/Adityakumar3456/uk-energy-wholesale-procurement.git)
cd uk-energy-wholesale-procurement
npm install
node index.js
