# Acquisition Tracker - Overall Progress Calculation

This document describes how the overall combined status percentage is calculated for each acquisition on the Acquisition Tracker page.

## Overview

The overall progress is calculated by averaging two parallel tracks:
- **Technical Integration Track** (50% weight)
- **Client Migrations Track** (50% weight)

---

## Technical Integration Track

### 1. Dev Platform
- **Data Source**: `AcquisitionProgress.devPlatform` (boolean)
- **Calculation**: 
  - If `true` (Connected): **100%**
  - If `false` (Not Connected): **0%**

### 2. Functionality in Console
- **Data Source**: 
  - `AcquisitionProgress.functionalityEpicsComplete`
  - `AcquisitionProgress.functionalityEpicsInProgress`
  - `AcquisitionProgress.functionalityEpicsToDo`
- **Calculation**: 
  ```
  Total Epics = Complete + In Progress + To Do
  Functionality % = (Complete / Total Epics) × 100
  ```
- **Note**: Only completed epics count toward progress percentage. In-progress epics are displayed visually but don't add to the percentage.

### Technical Progress Formula
```
Technical Progress = (Dev Platform % + Functionality %) / 2
```

---

## Client Migrations Track

### 1. Clients With Access to Console
- **Data Source**: 
  - `AcquisitionProgress.clientAccessCount`
  - `AcquisitionProgress.clientCountTotal`
- **Calculation**: 
  ```
  Client Access % = (clientAccessCount / clientCountTotal) × 100
  ```

### 2. Clients Active in the Console
- **Data Source**: 
  - `AcquisitionProgress.clientActiveCount`
  - `AcquisitionProgress.clientCountTotal`
- **Calculation**: 
  ```
  Client Active % = (clientActiveCount / clientCountTotal) × 100
  ```

### Client Progress Formula
```
Client Progress = (Client Access % + Client Active %) / 2
```

---

## Overall Combined Status

```
Overall Progress = (Technical Progress + Client Progress) / 2
```

The result is rounded to the nearest whole number.

---

## Example Calculation

Given the following data:
- Dev Platform: `true` (Connected)
- Functionality Epics: 6 complete, 2 in progress, 2 to do (10 total)
- Client Access: 7 out of 20
- Client Active: 3 out of 20

**Technical Integration:**
- Dev Platform = 100%
- Functionality = (6 / 10) × 100 = 60%
- Technical Progress = (100 + 60) / 2 = **80%**

**Client Migrations:**
- Client Access = (7 / 20) × 100 = 35%
- Client Active = (3 / 20) × 100 = 15%
- Client Progress = (35 + 15) / 2 = **25%**

**Overall:**
- Overall = (80 + 25) / 2 = 52.5% → **53%**

---

## Data Model Reference

The calculation uses the `AcquisitionProgress` table with these fields:
- `devPlatform` (Boolean)
- `functionalityEpicsToDo` (Int)
- `functionalityEpicsInProgress` (Int)
- `functionalityEpicsComplete` (Int)
- `clientCountTotal` (Int)
- `clientAccessCount` (Int)
- `clientActiveCount` (Int)

---

*Last updated: February 2026*
