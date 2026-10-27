EyeGuard System Documentation
Complete technical reference for the prediction system, machine learning models, and deployment

Last updated: September 2026 — Version 2.0.1


================================================================================
OVERVIEW
================================================================================

EyeGuard is a web-based research system designed for college students to analyze their screen time and self-reported symptoms related to eye strain and digital fatigue. It collects daily logs, generates a personal risk score, and provides preventive recommendations.

The system uses two prediction methods working together. The first is a rule-based scoring engine that runs inside the Next.js app and always produces a result. The second is a machine learning backend powered by Flask that uses Random Forest and Gradient Boosting models trained on real user data. When a student submits their daily log, the app tries the machine learning models first. If the Flask server responds successfully, the ML result is used. If it does not respond in time or is offline, the rule-based engine result is used instead. Either way, the user always gets a score.

This document covers everything about how the system works — how risk is calculated, how the machine learning models are trained, how the two systems connect, and how to run and deploy everything.


================================================================================
PART 1 — HOW RISK IS CALCULATED (RULE-BASED ENGINE)
================================================================================

This part describes the scoring logic that runs inside the Next.js app at api/predict-supabase. It runs every time a student submits their daily log, regardless of whether the Flask server is available. The same formulas are also used as a fallback when Flask is offline.

Step 1 — Symptom Score

The symptom score is the primary component of the risk score. It is based on four symptoms: eye strain, blurry vision, headaches, and dry eyes. Eye strain and blurry vision are weighted higher because they are the most direct indicators of digital eye strain. Headaches and dry eyes are weighted lower because they are secondary symptoms that can have other causes.

Each symptom is scored based on how often the student reports it. Never gives a multiplier of 0. Rarely (one to two times per week) gives 0.5. Sometimes (three to four times per week) gives 1.0. Often (five to six times per week) gives 1.5. Always (every day) gives 2.0.

The raw symptom score is calculated as: (eye strain frequency × 2) + (blurry vision frequency × 2) + (headaches frequency × 1) + (dry eyes frequency × 1). The maximum raw score is 12. This is then converted to a percentage out of 100.

Step 2 — Environmental Adjustments

Once the symptom score is established, points are added or subtracted based on the environmental and lifestyle factors from the daily log.

Screen time adds up to 25 points. Less than 2 hours adds nothing. Between 2 and 6 hours adds up to 15 points on a straight line. More than 6 hours adds between 15 and 25 points with diminishing returns.

Sleep adds up to 14 points if sleep is below the recommended range. Seven to nine hours is optimal and adds nothing. Six to seven hours adds 6 points. Five to six hours adds 10 points. Below five hours adds the maximum of 14 points. More than nine hours adds 2 points.

Screen brightness adds up to 6 points if it is outside the optimal range of 40 to 80 percent. Every ten percentage points outside that range adds 1.5 points, capped at 6.

Eye breaks reduce the score by up to 12 points. Each break removes 3 points from the total.

Blue light filter use reduces the score. Using it always removes 4 points. Regularly removes 2 points. Sometimes removes 1 point.

Regular exercise removes up to 3 points. Regular outdoor time of more than 2 hours removes up to 3 points.

Step 3 — Final Risk Score

If the student reported no symptoms at all, the score is based entirely on environmental factors and is capped at 35 percent. This cap exists because environmental factors alone cannot reliably indicate clinical eye strain without any symptoms.

If symptoms were reported, the symptom score and all environmental adjustments are added together and capped between 0 and 100.

Step 4 — Risk Levels

The final score maps to four levels. Low is 0 to 24 percent. Moderate is 25 to 49 percent. High is 50 to 74 percent. Critical is 75 to 100 percent.

Step 5 — Fatigue Score

The fatigue score is calculated separately from the risk score. It measures visual fatigue specifically — how much strain the eyes experienced from sustained focus — rather than overall risk. It runs from 0 to 10.

It is calculated from four components. Symptom burden contributes up to 5 points. Screen time contributes up to 2.5 points. Sleep deficit contributes up to 1.5 points. Taking no breaks contributes 1 point. The total is capped at 10.

This means a student with no symptoms but 9 hours of screen time and poor sleep can still have a high fatigue score, which is realistic.

Step 6 — Confidence Score

The confidence score reflects how complete the daily log was, not a statistical certainty. A fully filled-out log with all symptom frequencies answered, all lifestyle fields completed, and a history of at least 14 prior logs reaches a maximum of 92 percent. The ceiling is 92 because a rule-based model cannot claim the same certainty as a clinically validated diagnostic tool.


================================================================================
PART 2 — HOW THE MACHINE LEARNING MODELS WORK
================================================================================

This part describes the Flask backend and the three scikit-learn models that provide ML-powered predictions when the server is running.

The Three Models

The system uses three models. The first is a Random Forest classifier with 200 decision trees. It takes the 12 input features and outputs a risk level from 0 to 3. The second is a Gradient Boosting regressor, also with 200 estimators, that outputs the risk percentage as a continuous number from 0 to 100. The third is a Linear Regression model that outputs the fatigue score from 0 to 10.

The 12 Input Features

Every daily log is converted into 12 numerical features before being passed to the models. These are:

Screen time in minutes. Total break time in minutes. A symptom severity index from 0 to 1, calculated as the weighted average of the symptom names reported. Sleep quality normalised to 0 to 1. Water intake normalised against 8 cups (defaulted to 6 since it is not collected in the app). A break effectiveness score based on break type and duration. A break ratio comparing actual breaks to the recommended amount. Raw symptom count. Whether an outdoor break was taken, as a binary 0 or 1. Number of eye exercise sessions. Whether a blue light filter was used, as a binary. Screen time as a fraction of a full 24-hour day.

All 12 features are standardised using scikit-learn's StandardScaler before being passed to any of the three models.

How Symptoms Are Converted

The rule-based engine stores symptoms as frequency strings like "Often (5-6 times a week)". The ML engine needs named symptom strings. When calling Flask, the route converts them as follows: high eye strain frequency (1.5 or above) becomes "severe_eye_strain". Medium frequency (1.0) becomes "moderate_eye_strain". Low frequency becomes "mild_eye_discomfort". Blurry vision becomes "blurred_vision". Headaches become "headache". Dry eyes become "dry_eyes".

Training Data Strategy

The models retrain automatically. When the number of real Supabase rows is 20 or more, the models train entirely on real data. When there are fewer than 20 rows, 9000 synthetic samples are generated to fill in the gap. As of the current deployment the system has 89 real rows, so it trains on real data only.

The synthetic data simulates 300 users over 30 days each. Screen time is drawn from a random range of 4 to 14 hours. Symptoms are assigned based on a probability derived from screen time and break frequency. Risk labels are derived from the combination of symptom count and screen time.

When Real Data Is Used

When training on real Supabase data, the loader fetches these columns from the daily_logs table: screen_time, breaks_taken, eye_strain, headaches, blurry_vision, dry_eyes, brightness, sleep_hours, risk_level, and the four frequency fields. Binary symptom columns are converted to the named symptom strings. Breaks taken is multiplied by 5 to convert from a count to estimated minutes. Sleep hours is used directly as a proxy for sleep quality. Water intake defaults to 6 since the app does not collect it. Break type defaults to "rest" since the app does not collect it.

Retraining

Retraining happens in two ways. Automatically, every 10 new log submissions, the Flask server starts a background retraining thread. Manually, an admin can click "Retrain Model" in the admin panel, which calls the Flask retrain endpoint. The newly trained models are saved to disk in backend/ml/models as pickle files and used for all future predictions immediately.


================================================================================
PART 3 — HOW THE TWO SYSTEMS CONNECT
================================================================================

This part explains exactly what happens from the moment a student clicks Submit on their daily log to when the result is saved.

The Prediction Flow

The student submits the daily log form. The Next.js API route at api/predict-supabase receives the form data.

The rule-based engine runs immediately — symptom score, environmental modifiers, fatigue score, and confidence are all calculated. These values are stored as the fallback.

The route then calls the Flask endpoint at /api/ml/predict. It sends the converted feature dictionary including screen time in hours, break minutes, symptom names, sleep quality, and blue light filter status. The request has a 4-second timeout so the student is never left waiting.

If Flask responds with a successful result, the ML values for risk level, risk percentage, fatigue score, and confidence replace the rule-based values.

If Flask does not respond, times out, or returns an error, the rule-based values are used without any change to the user experience.

The final values — whichever source they came from — are saved to the daily_logs and predictions tables in Supabase.

The response returned to the app includes a prediction_source field that says either "flask" or "rule-based". This makes it easy to verify which path was used during a demo or debugging session.

The Flask Endpoint

The /api/ml/predict endpoint is protected by the X-Retrain-Key header, the same key used for the retrain endpoint. If the key does not match, it returns 401 Unauthorized. If the ML models are not yet loaded, it returns 503. On success, it returns risk_level as an integer, risk_level_name as a string, risk_percentage, fatigue_score, confidence, and risk_probabilities showing the probability for each of the four levels. The name "Severe" from the original Flask code is normalised to "Critical" to match the rest of the app.


================================================================================
PART 4 — HOW TO RUN THE SYSTEM LOCALLY
================================================================================

The system has two parts that need to run at the same time.

Running the Next.js App

Open a terminal in the project root and run npm run dev. The app will start at localhost:3000. The app works without Flask running — it will use the rule-based engine automatically.

Running the Flask Backend

Open a second terminal, navigate to the backend folder, activate the virtual environment with venv/Scripts/activate on Windows, then run python app.py. The Flask server starts at localhost:5000. On startup it loads the saved model files from backend/ml/models. If no model files exist, it trains new ones from the Supabase data automatically, which takes a minute or two.

Once Flask is running, every new daily log submission will go through the Random Forest and Gradient Boosting models instead of the rule-based engine.

Triggering a Manual Retrain

Log in as admin and go to the Admin Dashboard. Click the Retrain Model button. This calls the Flask retrain endpoint, which fetches all current Supabase data and trains the models fresh in a background thread. The button shows the current model status including how many Supabase rows are available.


================================================================================
PART 5 — HOW TO DEPLOY
================================================================================

The system has two deployment targets.

Next.js Frontend

Deploy to Vercel by connecting the GitHub repository. All API routes including chat, admin, and predictions run as serverless functions. The Supabase connection works the same way in production. Set all the environment variables from .env.local in the Vercel project settings.

Flask Backend

Deploy to Railway or Render. Both have free tiers. Set NEXT_PUBLIC_API_URL in Vercel to point to the deployed Flask URL instead of localhost:5000. Once deployed, retraining still works — the admin button calls the deployed Flask URL, Flask fetches from Supabase, retrains, and saves the models.

One limitation of free-tier deployments on Railway and Render is ephemeral storage. Saved model files (.pkl) are wiped when the server restarts. To avoid retraining from scratch every restart, the model files would need to be saved to Supabase Storage, AWS S3, or another persistent storage service, or a paid tier with persistent disk should be used.


================================================================================
PART 6 — RESEARCH BASIS
================================================================================

The symptom weighting used in the rule-based engine is grounded in published clinical research on digital eye strain. The weighting of eye strain and blurry vision as primary symptoms, and headaches and dry eyes as secondary, follows clinical findings about Computer Vision Syndrome. Environmental thresholds come from the following sources.

Screen time thresholds are based on American Optometric Association guidance from 2016, which identifies two or more hours of continuous screen use as the onset threshold for digital eye strain.

Sleep thresholds are based on National Sleep Foundation recommendations from 2020 and research by Sheppard and Wolffsohn (2018) on the relationship between sleep and tear film stability.

Brightness thresholds are based on ISO 9241-303:2011, the international ergonomics standard for electronic visual displays, which identifies 40 to 80 percent as the optimal luminance range.

Eye break recommendations are based on the 20-20-20 rule endorsed by the American Optometric Association.

Blue light filter benefits are based on Sheppard and Wolffsohn (2018).

Outdoor time benefits are based on Huang et al. (2015) on the association between near work activities and eye strain.

Exercise benefits are based on Scheiman and Wick (Clinical Management of Binocular Vision, 2014).


================================================================================
WHAT IS ACCURATE TO SAY ABOUT THIS SYSTEM
================================================================================

The system collects screen time, symptom frequency, sleep, brightness, lifestyle habits, and demographic data from college students. It uses a rule-based scoring engine for reliable, always-available predictions grounded in published clinical research. When the Flask backend is running, it uses Random Forest classification and Gradient Boosting regression models trained on real user-submitted data to produce the final risk level and percentage. Recommendations are selected from a Supabase wellness_tips table based on the user's active symptoms, risk level, and threshold triggers. The system is not a medical diagnostic tool. It is a research and awareness system intended to help students identify behavioural risk factors for digital eye strain.
