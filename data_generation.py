import pandas as pd
from faker import Faker
import random
import uuid
import os

print("Initializing Faker and setting up data structures...")
fake = Faker('en_IN')

# Configuration: Number of records to generate
NUM_UNITS = 100
NUM_COURTS = 50
NUM_EMPLOYEES = 500
NUM_CASES = 30000
NUM_ACCUSED = 50000
NUM_ARRESTS = 30000
NUM_CHARGESHEETS = 20000

OUTPUT_DIR = "dataset_csvs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------
# 1. Base Entities: Unit, Court, Employee
# ---------------------------------------------------------
print(f"Generating {NUM_UNITS} Units...")
units = [{"UnitID": str(uuid.uuid4()), "UnitName": fake.city() + " Police Station"} for _ in range(NUM_UNITS)]
unit_ids = [u["UnitID"] for u in units]

print(f"Generating {NUM_COURTS} Courts...")
courts = [{"CourtID": str(uuid.uuid4()), "CourtName": fake.city() + " District Court"} for _ in range(NUM_COURTS)]
court_ids = [c["CourtID"] for c in courts]

print(f"Generating {NUM_EMPLOYEES} Employees...")
employees = []
for _ in range(NUM_EMPLOYEES):
    employees.append({
        "EmployeeID": str(uuid.uuid4()),
        "EmployeeName": fake.name(),
        "UnitID": random.choice(unit_ids),
        "Rank": random.choice(["Inspector", "Sub-Inspector", "Constable"])
    })

# ---------------------------------------------------------
# 2. CaseMaster
# ---------------------------------------------------------
print(f"Generating {NUM_CASES} CaseMaster records...")
cases = []
case_ids = []
crime_types = ["Cyber Fraud", "Theft", "Assault", "Robbery", "Narcotics", "Financial Fraud"]

for _ in range(NUM_CASES):
    case_id = str(uuid.uuid4())
    # CrimeNo must be an 18-digit string
    crime_no = "".join([str(random.randint(0, 9)) for _ in range(18)])
    
    cases.append({
        "CaseMasterID": case_id,
        "CrimeNo": crime_no,
        "UnitID": random.choice(unit_ids),
        "CourtID": random.choice(court_ids),
        "FIR_Date": fake.date_between(start_date='-5y', end_date='today').isoformat(),
        "Crime_Type": random.choice(crime_types),
        "Status": random.choice(["Under Investigation", "Chargesheet Filed", "Closed"])
    })
    case_ids.append(case_id)

# ---------------------------------------------------------
# 3. Accused
# ---------------------------------------------------------
print(f"Generating {NUM_ACCUSED} Accused records...")
accused_list = []
accused_ids = []

for _ in range(NUM_ACCUSED):
    accused_id = str(uuid.uuid4())
    accused_list.append({
        "AccusedMasterID": accused_id,
        "CaseMasterID": random.choice(case_ids),  # Strict referential integrity
        "Name": fake.name(),
        "Age": random.randint(18, 70),
        "Gender": random.choice(["Male", "Female", "Other"])
    })
    accused_ids.append(accused_id)

# ---------------------------------------------------------
# 4. ArrestSurrender
# ---------------------------------------------------------
print(f"Generating {NUM_ARRESTS} ArrestSurrender records...")
arrests = []
# Pick a random subset of accused that got arrested
arrested_accused = random.sample(accused_list, NUM_ARRESTS)

for acc in arrested_accused:
    arrests.append({
        "ArrestSurrenderID": str(uuid.uuid4()),
        "CaseMasterID": acc["CaseMasterID"],
        "AccusedMasterID": acc["AccusedMasterID"],
        "ArrestDate": fake.date_between(start_date='-2y', end_date='today').isoformat()
    })

# ---------------------------------------------------------
# 5. ChargesheetDetails
# ---------------------------------------------------------
print(f"Generating {NUM_CHARGESHEETS} ChargesheetDetails records...")
chargesheets = []
# Pick random cases that have chargesheets
charged_cases = random.sample(case_ids, NUM_CHARGESHEETS)

for c_id in charged_cases:
    chargesheets.append({
        "ChargesheetID": str(uuid.uuid4()),
        "CaseMasterID": c_id,
        "ChargesheetDate": fake.date_between(start_date='-1y', end_date='today').isoformat()
    })

# ---------------------------------------------------------
# 6. ZCQL_Edges (Graph Traversal Links)
# ---------------------------------------------------------
print("Generating ZCQL_Edges table for Graph Engine...")
edges = []

# Link Case -> Unit
for c in cases:
    edges.append({
        "EdgeID": str(uuid.uuid4()),
        "SourceID": c["CaseMasterID"],
        "TargetID": c["UnitID"],
        "RelationshipType": "REGISTERED_AT"
    })

# Link Accused -> Case
for acc in accused_list:
    edges.append({
        "EdgeID": str(uuid.uuid4()),
        "SourceID": acc["AccusedMasterID"],
        "TargetID": acc["CaseMasterID"],
        "RelationshipType": "INVOLVED_IN"
    })

# Link Arrest -> Accused
for arr in arrests:
    edges.append({
        "EdgeID": str(uuid.uuid4()),
        "SourceID": arr["ArrestSurrenderID"],
        "TargetID": arr["AccusedMasterID"],
        "RelationshipType": "ARRESTED_PERSON"
    })

# ---------------------------------------------------------
# 7. Export to CSV
# ---------------------------------------------------------
print("Exporting data to CSV files...")
pd.DataFrame(units).to_csv(f"{OUTPUT_DIR}/units.csv", index=False)
pd.DataFrame(courts).to_csv(f"{OUTPUT_DIR}/courts.csv", index=False)
pd.DataFrame(employees).to_csv(f"{OUTPUT_DIR}/employees.csv", index=False)
pd.DataFrame(cases).to_csv(f"{OUTPUT_DIR}/case_master.csv", index=False)
pd.DataFrame(accused_list).to_csv(f"{OUTPUT_DIR}/accused.csv", index=False)
pd.DataFrame(arrests).to_csv(f"{OUTPUT_DIR}/arrest_surrender.csv", index=False)
pd.DataFrame(chargesheets).to_csv(f"{OUTPUT_DIR}/chargesheets.csv", index=False)
pd.DataFrame(edges).to_csv(f"{OUTPUT_DIR}/zcql_edges.csv", index=False)

print(f"Data generation complete! {len(edges)} graph edges generated.")
print(f"All CSV files have been saved to the '{OUTPUT_DIR}' directory.")
