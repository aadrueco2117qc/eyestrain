FRONT END RUN

cd c:\Users\macky\.gemini\antigravity\scratch\v0-eyestrain
"C:\Program Files\nodejs\npm.cmd" run dev

cd c:\Users\macky\.gemini\antigravity\scratch\v0-eyestrain
npm run dev


ML RUN
cd c:\Users\macky\.gemini\antigravity\scratch\v0-eyestrain\backend
venv\Scripts\activate
python app.py


cd "c:/Users/macky/.gemini/antigravity/scratch/v0-eyestrain"
git add .
git status
git commit -m "Add ML Supabase training, survey import, run guide, admin+recommendations spec"
git push origin main

localhost:3000

RETRAIN MODEL
cd c:\Users\darkt\Videos\v0-eyestrain-main\backend
venv\Scripts\activate
python app.py



commit and push
git add .
git commit -m "notification removed"
git push



How to Run the Project:
1. Run Frontend (Next.js)
Open a terminal in the root CAPSTONE directory and run:

powershell
npm run dev
Access in browser at: http://localhost:3000

2. Run Backend (Flask / ML Service)
Open a separate terminal in CAPSTONE\backend and run:

powershell
.\venv\Scripts\python.exe app.py
Backend runs at: http://localhost:5000