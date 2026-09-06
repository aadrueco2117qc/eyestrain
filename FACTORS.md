EyeGuard — Risk Factors and Score Explanation


What the risk score is

The risk score is a number from 0 to 100 percent that estimates how likely you are to be experiencing Computer Vision Syndrome (CVS) based on what you reported in your daily log. It is not a medical diagnosis. It is a screening estimate that tells you whether your current habits and symptoms put you in a concerning zone, and if so, how concerned you should be.

The score has four levels:

    0 to 24 percent — Low. Your symptoms and habits are within a safe range.
    25 to 49 percent — Moderate. You are approaching the clinical threshold. Small habit changes now will help.
    50 to 74 percent — High. Your score meets the criteria associated with CVS in published clinical research.
    75 to 100 percent — Critical. Severe eye strain is likely. You should rest your eyes and consider seeing an eye care professional if symptoms persist.


Where the score comes from

The score is calculated the moment you submit your daily log. It goes through the prediction system, gets stored in the database alongside your log entry, and is then shown to you on the Risk page and in your exported data. The Risk Level you see in your exported spreadsheet is the exact same value that was computed from your inputs on the day you submitted. Nothing is recalculated after the fact.

The calculation has two parts: a symptom score and a set of environmental adjustments.


Part 1 — Symptom score

The symptom portion is based on published clinical research on digital eye strain, including work by Seguí et al. (2015) in the Journal of Clinical Epidemiology. That research established that not all symptoms are equally associated with eye strain, which is why the scoring assigns different weights to different symptoms.

Eye strain and blurry vision are weighted at 2 each because they are the primary indicators of accommodative stress from screen use. Headaches and dry eyes are weighted at 1 each because they are secondary symptoms that appear alongside other digital eye strain signs but are less specific on their own.

Each symptom is then multiplied by how often you said it happens. Never gives a multiplier of 0, meaning it adds nothing to the score. Rarely gives 0.5, Sometimes gives 1.0, Often gives 1.5, and Always gives 2.0. The maximum raw symptom score is 12. That number is then converted to a percentage out of 100 to give the symptom component of your risk score.

The clinical threshold identified in that research is a raw score of 6 or more, which translates to 50 percent or above on this scale. That is why a score of 50 or higher is labelled High risk.


Part 2 — Environmental adjustments

Once the symptom score is established, the system adds or subtracts points based on the environmental and lifestyle factors you logged. These adjustments can push the score up if your habits are risky or pull it down if they are protective. They are capped so that they cannot dominate the score — symptoms remain the primary driver.

Screen time adds up to 25 points depending on how many hours you reported. This is based on American Optometric Association guidance, which identifies two or more hours of continuous screen use as the clinical onset threshold for digital eye strain, and six or more hours per day as the high-exposure threshold.

Sleep adds up to 14 points if your sleep is below the recommended range. The optimal amount for eye recovery is seven to nine hours. Sleep below seven hours affects tear film stability and ocular surface recovery. Below five hours, the maximum penalty applies. This threshold comes from National Sleep Foundation recommendations and research by Sheppard and Wolffsohn (2018).

Screen brightness adds up to 6 points if your brightness is outside the optimal zone of 40 to 80 percent. The standard for this range comes from ISO 9241-303, the international ergonomics standard for electronic visual displays. Every ten percentage points outside that range adds a small penalty, capped at 6 points total.

Eye breaks reduce the score by up to 12 points. Each break you log removes 3 points. This is based on the 20-20-20 rule, which is a clinically endorsed recommendation from the AOA: every 20 minutes, look at something 20 feet away for 20 seconds to relieve accommodative fatigue.

Blue light filter usage can reduce the score by up to 4 points. Using a filter sometimes gives a small reduction. Using it always gives the full benefit. This is based on Sheppard and Wolffsohn (2018), which found that blue-light filtering reduces photostress and improves visual comfort.

Exercise reduces the score by up to 3 points. Regular physical activity improves ocular blood flow and lowers systemic fatigue that contributes to eye strain. This is based on research by Scheiman et al.

Outdoor time reduces the score by up to 3 points. Spending time outdoors rests the accommodative system because you are focusing at long distances instead of near ones. More than 30 minutes outdoors begins to provide a benefit, with the full benefit at over two hours. This threshold comes from Huang et al. (2015).


How the final number is calculated

If you reported no symptoms at all, the score is based entirely on environmental factors and is capped at 35 percent. This cap exists because without any reported symptoms, a fully environmental score cannot reliably indicate clinical CVS.

If you did report symptoms, the symptom score and all environmental adjustments are combined and capped between 0 and 100.


The fatigue score

The fatigue score is separate from the risk score. It measures visual fatigue severity specifically — the strain your eyes experience from sustained focus and reduced blinking — rather than overall CVS risk. It runs from 0 to 10 and is calculated from your symptom intensity, screen time, sleep hours, and how many breaks you took. A user with high symptoms but moderate screen time will have moderate fatigue. A user with extreme screen time but no symptoms will still register noticeable fatigue because of the accommodation load alone.


What is shown in the exported spreadsheet

When you export your data from the Analytics page, the Risk Level column shows the label that was assigned to you on that specific day when you submitted your log. It reflects the output of the prediction system at that moment, calculated directly from the inputs you entered. The labels come from the prediction stored in the database — Low, Moderate, High, or Critical — mapped from the numeric risk level. What you see in the export is accurate to what was calculated from your actual answers that day.


Data completeness

The data completeness percentage shown on some screens reflects how complete your daily log entry was, not a statistical probability. A fully completed log with all four symptom fields answered, all lifestyle fields filled in, and a history of at least 14 prior logs reaches a maximum of 92 percent. The ceiling is not 100 percent because a rule-based system, no matter how well filled out, cannot claim the same confidence as a trained model validated against clinical outcomes. 92 percent is the honest ceiling.


Limitations

This system does not diagnose any eye condition. It identifies behavioural and environmental risk factors associated with digital eye strain based on published clinical guidelines. The weights used in the calculation are derived from peer-reviewed research, not learned from a dataset. Accuracy improves the more consistently you log, because a single entry provides limited pattern information. If your symptoms are persistent, severe, or worsening, please consult a licensed eye care professional.


Research basis

Seguí MM, Cabrero-García J, Crespo A, Verdú J, Ronda E. A reliable and valid questionnaire was developed to measure computer vision syndrome at the workplace. Journal of Clinical Epidemiology. 2015;68(6):662-73.

American Optometric Association. Digital Eye Strain Report. AOA, 2016.

National Sleep Foundation. Sleep Duration Recommendations. NSF, 2020.

ISO 9241-303:2011. Ergonomics of Human-System Interaction — Requirements for Electronic Visual Displays. ISO, 2011.

Sheppard AL, Wolffsohn JS. Digital eye strain: prevalence, measurement and amelioration. BMJ Open Ophthalmology. 2018;3(1):e000146.

Huang HM, Chang DS, Wu PC. The Association between Near Work Activities and Myopia in Children — A Systematic Review and Meta-Analysis. PLOS ONE. 2015;10(10):e0140419.

Scheiman M, Wick B. Clinical Management of Binocular Vision. 4th ed. Lippincott Williams and Wilkins, 2014.
