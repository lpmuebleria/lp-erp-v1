from api.reports import generate_team_activity_report, ReportRequest
from database import db

# create test request
r = ReportRequest(
    start_date="2026-03-01",
    end_date="2026-03-31",
    selected_families=["comision", "muebles", "utilidad_bruta", "fletes", "envios", "empaque", "maniobras", "garantias"],
    include_expenses=False
)

res = generate_team_activity_report(r)
print("Type of response:", type(res))
