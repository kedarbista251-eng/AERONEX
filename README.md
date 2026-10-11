# AERONEX / AeroSync AI

**Intelligent Air Operations Decision Support Platform** (Non-combat logistics and planning demonstrator).

AeroSync AI provides automated scheduling, dynamic constraint resolution, data-quality monitoring, and decision support for air transport and resource allocation operations.

---

## 🚀 Features

- **Resource & Fleet Management**: Live tracking of aircraft, maintenance schedules, crew availability, and status.
- **Dynamic Constraint Solver**: Powered by OR-Tools to resolve allocation bottlenecks, runway capacities, and turnaround times.
- **Data Quality & Alert Monitoring**: Detects stale data feeds, conflicting maintenance slots, and infeasible operational requests.
- **Interactive Planning Workspace**: What-if scenario creation, evaluation scores, and recommendation generation.
- **Human-in-the-Loop Review**: Recommendation approval workflow with reason tracking and immutable audit trails.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, Google OR-Tools, Pydantic, Pytest
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons

---

## 🏁 Quick Start

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment (if needed)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --port 8000
```
Backend Swagger API docs available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend application available at: `http://localhost:5173`

---

## 🧪 Testing

```bash
cd backend
python -m pytest -v
```
