'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button, InputField, TextAreaField } from '@/components/form-components';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface FormData {
  // Section 1: Student Profile
  age: string;
  gender: string;
  yearLevel: string;
  fieldOfStudy: string;
  // Section 2: Daily Screen Time
  academicScreenTime: string;
  nonAcademicScreenTime: string;
  primaryDevice: string;
  // Section 3: Eye Strain & Symptoms
  eyeStrainFrequency: string;
  headachesFrequency: string;
  blurryVisionFrequency: string;
  dryEyesFrequency: string;
  // Section 4: Lifestyle & Habits
  exerciseFrequency: string;
  outdoorTime: string;
  blueLight: string;
  screenHeight: string;
  // Section 5: Environment & Settings
  screenBrightness: string;
  sleepHours: string;
  screenDistance: string;
  roomLighting: string;
  // Section 6: Additional Information
  additionalNotes: string;
}

const SectionHeader = ({ number, title }: { number: number; title: string }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
        {number}
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-foreground">
        SECTION {number}: {title}
      </h2>
    </div>
    <div className="h-1 w-16 bg-primary rounded-full" />
  </div>
);

const FormSection = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-6">{children}</div>
);

const FormField = ({
  label,
  required,
  children,
  fieldId,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  fieldId?: string;
}) => (
  <div className="space-y-3">
    <label htmlFor={fieldId} className="text-sm font-medium text-foreground block">
      {label}
      {required && (
        <span className="text-red-500 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {children}
  </div>
);

interface ScreenTimeFormProps {
  onSubmit: (data: {
    screenTime: number;
    breaksTaken: number;
    symptoms: string[];
    brightness: number;
    sleepHours: number;
    notes: string;
    age?: string;
    gender?: string;
    yearLevel?: string;
    fieldOfStudy?: string;
    academicScreenTime?: string;
    nonAcademicScreenTime?: string;
    primaryDevice?: string;
    eyeStrainFrequency?: string;
    headachesFrequency?: string;
    blurryVisionFrequency?: string;
    dryEyesFrequency?: string;
  }) => Promise<void>;
  defaultValues?: {
    age?: string;
    gender?: string;
    yearLevel?: string;
    fieldOfStudy?: string;
    academicScreenTime?: string;
    nonAcademicScreenTime?: string;
    primaryDevice?: string;
    eyeStrainFrequency?: string;
    headachesFrequency?: string;
    blurryVisionFrequency?: string;
    dryEyesFrequency?: string;
    exerciseFrequency?: string;
    outdoorTime?: string;
    blueLight?: string;
    screenHeight?: string;
    screenDistance?: string;
    roomLighting?: string;
    sleepHours?: string;
  };
}

const AGE_OPTIONS = ['17-18', '19-20', '21-22', '23+', 'Other'];
const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say', 'Other'];
const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year or higher'];
const FIELD_OF_STUDY_OPTIONS = [
  'IT / Computer Science',
  'Engineering',
  'Business',
  'Health Sciences',
  'Education',
  'Arts and Humanities',
  'Other',
];

const ACADEMIC_SCREEN_TIME_OPTIONS = [
  'Less than 2 hours',
  '2–4 hours',
  '4–6 hours',
  '6–8 hours',
  'More than 8 hours',
];

const NON_ACADEMIC_SCREEN_TIME_OPTIONS = [
  'Less than 1 hour',
  '1–3 hours',
  '3–5 hours',
  '5–7 hours',
  'More than 7 hours',
];

const PRIMARY_DEVICE_OPTIONS = ['Smartphone', 'Laptop', 'Desktop Computer', 'Tablet', 'Other'];

const FREQUENCY_OPTIONS = [
  'Never',
  'Rarely (1-2 times a week)',
  'Sometimes (3-4 times a week)',
  'Often (5-6 times a week)',
  'Always (every day)',
];

const EXERCISE_OPTIONS = [
  'None - Sedentary lifestyle',
  'Minimal (1-2 times per week)',
  'Moderate (3-4 times per week)',
  'Regular (5+ times per week)',
];

const OUTDOOR_TIME_OPTIONS = [
  'Less than 30 minutes daily',
  '30 minutes to 1 hour daily',
  '1-2 hours daily',
  'More than 2 hours daily',
];

const BLUE_LIGHT_OPTIONS = [
  'Never use blue light filters',
  'Sometimes (evenings only)',
  'Regularly (most of the time)',
  'Always (all day)',
];

const SCREEN_HEIGHT_OPTIONS = [
  'Below eye level',
  'At eye level (optimal)',
  'Above eye level',
  'Varies frequently',
];

const SCREEN_DISTANCE_OPTIONS = [
  'Less than 20cm (too close)',
  '20-30cm (close)',
  '30-50cm (optimal)',
  'More than 50cm (too far)',
];

const ROOM_LIGHTING_OPTIONS = [
  'Very dim or dark',
  'Dim lighting',
  'Adequate and balanced',
  'Very bright (glare)',
];

export function ScreenTimeForm({ onSubmit, defaultValues }: ScreenTimeFormProps) {
  const [currentSection, setCurrentSection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Refs for auto-scrolling to the first invalid field
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const errorBannerRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState<FormData>({
    age: defaultValues?.age || '',
    gender: defaultValues?.gender || '',
    yearLevel: defaultValues?.yearLevel || '',
    fieldOfStudy: defaultValues?.fieldOfStudy || '',
    academicScreenTime: defaultValues?.academicScreenTime || '',
    nonAcademicScreenTime: defaultValues?.nonAcademicScreenTime || '',
    primaryDevice: defaultValues?.primaryDevice || '',
    eyeStrainFrequency: defaultValues?.eyeStrainFrequency || '',
    headachesFrequency: defaultValues?.headachesFrequency || '',
    blurryVisionFrequency: defaultValues?.blurryVisionFrequency || '',
    dryEyesFrequency: defaultValues?.dryEyesFrequency || '',
    exerciseFrequency: defaultValues?.exerciseFrequency || '',
    outdoorTime: defaultValues?.outdoorTime || '',
    blueLight: defaultValues?.blueLight || '',
    screenHeight: defaultValues?.screenHeight || '',
    sleepHours: defaultValues?.sleepHours || '',
    screenBrightness: '0', // always starts fresh — brightness changes daily
    screenDistance: defaultValues?.screenDistance || '',
    roomLighting: defaultValues?.roomLighting || '',
    additionalNotes: '',
  });

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  }, []);

  // Returns the fieldId of the first invalid field, or null if section is valid
  const validateSection = (section: number): string | null => {
    switch (section) {
      case 1:
        if (!formData.age) {
          setError('Please select your age range');
          return 'age';
        }
        if (!formData.gender) {
          setError('Please select your gender');
          return 'gender';
        }
        if (!formData.yearLevel) {
          setError('Please select your year level');
          return 'yearLevel';
        }
        if (!formData.fieldOfStudy) {
          setError('Please select your field of study');
          return 'fieldOfStudy';
        }
        return null;
      case 2:
        if (!formData.academicScreenTime) {
          setError('Please select your academic screen time');
          return 'academicScreenTime';
        }
        if (!formData.nonAcademicScreenTime) {
          setError('Please select your non-academic screen time');
          return 'nonAcademicScreenTime';
        }
        if (!formData.primaryDevice) {
          setError('Please select your primary device');
          return 'primaryDevice';
        }
        return null;
      case 3:
        if (!formData.eyeStrainFrequency) {
          setError('Please select eye strain frequency');
          return 'eyeStrainFrequency';
        }
        if (!formData.headachesFrequency) {
          setError('Please select headaches frequency');
          return 'headachesFrequency';
        }
        if (!formData.blurryVisionFrequency) {
          setError('Please select blurry vision frequency');
          return 'blurryVisionFrequency';
        }
        if (!formData.dryEyesFrequency) {
          setError('Please select dry eyes frequency');
          return 'dryEyesFrequency';
        }
        return null;
      case 4:
        if (!formData.exerciseFrequency) {
          setError('Please select your exercise frequency');
          return 'exerciseFrequency';
        }
        if (!formData.outdoorTime) {
          setError('Please select your outdoor time');
          return 'outdoorTime';
        }
        if (!formData.blueLight) {
          setError('Please select your blue light filter usage');
          return 'blueLight';
        }
        return null;
      case 5:
        if (!formData.screenHeight) {
          setError('Please select your screen height position');
          return 'screenHeight';
        }
        if (!formData.screenDistance) {
          setError('Please select your screen distance');
          return 'screenDistance';
        }
        if (!formData.roomLighting) {
          setError('Please select your room lighting');
          return 'roomLighting';
        }
        return null;
      case 6:
        if (!formData.sleepHours) {
          setError('Please enter your sleep hours');
          return 'sleepHours';
        }
        if (parseFloat(formData.sleepHours) < 0 || parseFloat(formData.sleepHours) > 24) {
          setError('Please enter sleep hours between 0 and 24');
          return 'sleepHours';
        }
        if (!formData.screenBrightness) {
          setError('Please select your screen brightness');
          return 'screenBrightness';
        }
        return null;
      default:
        return null;
    }
  };

  const scrollToField = (fieldId: string) => {
    const el = fieldRefs.current[fieldId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the element if it can receive focus
      if (typeof (el as HTMLElement).focus === 'function') {
        (el as HTMLElement).focus({ preventScroll: true });
      }
    } else if (errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNext = () => {
    const invalidField = validateSection(currentSection);
    if (invalidField === null) {
      setCurrentSection(currentSection + 1);
      setError('');
    } else {
      scrollToField(invalidField);
    }
  };

  const handlePrevious = () => {
    setCurrentSection(currentSection - 1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invalidField = validateSection(currentSection);
    if (invalidField !== null) {
      scrollToField(invalidField);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Convert categorical data to numerical values for the ML model
      const academicHours = {
        'Less than 2 hours': 1,
        '2–4 hours': 3,
        '4–6 hours': 5,
        '6–8 hours': 7,
        'More than 8 hours': 10,
      }[formData.academicScreenTime] || 0;

      const nonAcademicHours = {
        'Less than 1 hour': 0.5,
        '1–3 hours': 2,
        '3–5 hours': 4,
        '5–7 hours': 6,
        'More than 7 hours': 8,
      }[formData.nonAcademicScreenTime] || 0;

      const totalScreenTime = academicHours + nonAcademicHours;

      // Map symptom frequencies to 0-4 scale
      const frequencyMap = {
        'Never': 0,
        'Rarely (1-2 times a week)': 1,
        'Sometimes (3-4 times a week)': 2,
        'Often (5-6 times a week)': 3,
        'Always (every day)': 4,
      };

      const symptoms = [
        frequencyMap[formData.eyeStrainFrequency as keyof typeof frequencyMap] > 0 ? 'eyeStrain' : '',
        frequencyMap[formData.headachesFrequency as keyof typeof frequencyMap] > 0 ? 'headaches' : '',
        frequencyMap[formData.blurryVisionFrequency as keyof typeof frequencyMap] > 0 ? 'blurryVision' : '',
        frequencyMap[formData.dryEyesFrequency as keyof typeof frequencyMap] > 0 ? 'dryEyes' : '',
      ].filter(Boolean);

      const submitData = {
        screenTime: totalScreenTime,
        breaksTaken: 0,
        symptoms,
        brightness: parseInt(formData.screenBrightness) || 75,
        sleepHours: parseFloat(formData.sleepHours) || 0,
        notes: formData.additionalNotes,
        // Pass all profile and screen time data
        age: formData.age,
        gender: formData.gender,
        yearLevel: formData.yearLevel,
        fieldOfStudy: formData.fieldOfStudy,
        academicScreenTime: formData.academicScreenTime,
        nonAcademicScreenTime: formData.nonAcademicScreenTime,
        primaryDevice: formData.primaryDevice,
        eyeStrainFrequency: formData.eyeStrainFrequency,
        headachesFrequency: formData.headachesFrequency,
        blurryVisionFrequency: formData.blurryVisionFrequency,
        dryEyesFrequency: formData.dryEyesFrequency,
        exerciseFrequency: formData.exerciseFrequency,
        outdoorTime: formData.outdoorTime,
        blueLight: formData.blueLight,
        screenHeight: formData.screenHeight,
        screenDistance: formData.screenDistance,
        roomLighting: formData.roomLighting,
      };
      
      await onSubmit(submitData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit form';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div
          ref={errorBannerRef}
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Section 1: Student Profile */}
      {currentSection === 1 && (
        <FormSection>
          <SectionHeader number={1} title="STUDENT PROFILE" />

          <FormField label="Age" required fieldId="age">
            <select
              id="age"
              ref={(el) => { fieldRefs.current['age'] = el; }}
              value={formData.age || ''}
              onChange={(e) => handleInputChange('age', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select your age range</option>
              {AGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Gender" required fieldId="gender">
            <select
              id="gender"
              ref={(el) => { fieldRefs.current['gender'] = el; }}
              value={formData.gender || ''}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select your gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Year Level" required fieldId="yearLevel">
            <select
              id="yearLevel"
              ref={(el) => { fieldRefs.current['yearLevel'] = el; }}
              value={formData.yearLevel || ''}
              onChange={(e) => handleInputChange('yearLevel', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select your year level</option>
              {YEAR_LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Field of Study" required fieldId="fieldOfStudy">
            <select
              id="fieldOfStudy"
              ref={(el) => { fieldRefs.current['fieldOfStudy'] = el; }}
              value={formData.fieldOfStudy || ''}
              onChange={(e) => handleInputChange('fieldOfStudy', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select your field of study</option>
              {FIELD_OF_STUDY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </FormField>
        </FormSection>
      )}

      {/* Section 2: Daily Screen Time */}
      {currentSection === 2 && (
        <FormSection>
          <SectionHeader number={2} title="DAILY SCREEN TIME" />

          <FormField label="Average daily screen time for academic purposes" required fieldId="academicScreenTime">
            <div
              id="academicScreenTime"
              ref={(el) => { fieldRefs.current['academicScreenTime'] = el; }}
              className="space-y-2"
            >
              {ACADEMIC_SCREEN_TIME_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  <input
                    type="radio"
                    name="academic-screen-time"
                    value={option}
                    checked={formData.academicScreenTime === option}
                    onChange={(e) => handleInputChange('academicScreenTime', e.target.value)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Average daily screen time for non-academic purposes (social media, gaming, entertainment)" required fieldId="nonAcademicScreenTime">
            <div
              id="nonAcademicScreenTime"
              ref={(el) => { fieldRefs.current['nonAcademicScreenTime'] = el; }}
              className="space-y-2"
            >
              {NON_ACADEMIC_SCREEN_TIME_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  <input
                    type="radio"
                    name="non-academic-screen-time"
                    value={option}
                    checked={formData.nonAcademicScreenTime === option}
                    onChange={(e) => handleInputChange('nonAcademicScreenTime', e.target.value)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Which device do you use the most for screen activities?" required fieldId="primaryDevice">
            <div
              id="primaryDevice"
              ref={(el) => { fieldRefs.current['primaryDevice'] = el; }}
              className="space-y-2"
            >
              {PRIMARY_DEVICE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                >
                  <input
                    type="radio"
                    name="primary-device"
                    value={option}
                    checked={formData.primaryDevice === option}
                    onChange={(e) => handleInputChange('primaryDevice', e.target.value)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </FormField>
        </FormSection>
      )}

      {/* Section 3: Eye Strain & Symptoms */}
      {currentSection === 3 && (
        <FormSection>
          <SectionHeader number={3} title="EYE STRAIN & SYMPTOMS" />

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
            <p className="text-sm text-foreground">
              Please rate the frequency of the following symptoms you experience during or after screen use:
            </p>
          </div>

          <FormField label="Eye Strain" required fieldId="eyeStrainFrequency">
            <select
              id="eyeStrainFrequency"
              ref={(el) => { fieldRefs.current['eyeStrainFrequency'] = el; }}
              value={formData.eyeStrainFrequency}
              onChange={(e) => handleInputChange('eyeStrainFrequency', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Headaches" required fieldId="headachesFrequency">
            <select
              id="headachesFrequency"
              ref={(el) => { fieldRefs.current['headachesFrequency'] = el; }}
              value={formData.headachesFrequency}
              onChange={(e) => handleInputChange('headachesFrequency', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Blurry Vision" required fieldId="blurryVisionFrequency">
            <select
              id="blurryVisionFrequency"
              ref={(el) => { fieldRefs.current['blurryVisionFrequency'] = el; }}
              value={formData.blurryVisionFrequency}
              onChange={(e) => handleInputChange('blurryVisionFrequency', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Dry Eyes" required fieldId="dryEyesFrequency">
            <select
              id="dryEyesFrequency"
              ref={(el) => { fieldRefs.current['dryEyesFrequency'] = el; }}
              value={formData.dryEyesFrequency}
              onChange={(e) => handleInputChange('dryEyesFrequency', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>
        </FormSection>
      )}

      {/* Section 4: Lifestyle & Habits */}
      {currentSection === 4 && (
        <FormSection>
          <SectionHeader number={4} title="LIFESTYLE & HABITS" />

          <FormField label="How often do you exercise or engage in physical activity?" required fieldId="exerciseFrequency">
            <select
              id="exerciseFrequency"
              ref={(el) => { fieldRefs.current['exerciseFrequency'] = el; }}
              value={formData.exerciseFrequency}
              onChange={(e) => handleInputChange('exerciseFrequency', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select frequency</option>
              {EXERCISE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="How much time do you spend outdoors daily?" required fieldId="outdoorTime">
            <select
              id="outdoorTime"
              ref={(el) => { fieldRefs.current['outdoorTime'] = el; }}
              value={formData.outdoorTime}
              onChange={(e) => handleInputChange('outdoorTime', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select duration</option>
              {OUTDOOR_TIME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Do you use blue light filters or night mode on your devices?" required fieldId="blueLight">
            <select
              id="blueLight"
              ref={(el) => { fieldRefs.current['blueLight'] = el; }}
              value={formData.blueLight}
              onChange={(e) => handleInputChange('blueLight', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select option</option>
              {BLUE_LIGHT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>
        </FormSection>
      )}

      {/* Section 5: Environment & Settings */}
      {currentSection === 5 && (
        <FormSection>
          <SectionHeader number={5} title="ENVIRONMENT & SETTINGS" />

          <FormField label="How is your screen positioned relative to your eyes?" required fieldId="screenHeight">
            <select
              id="screenHeight"
              ref={(el) => { fieldRefs.current['screenHeight'] = el; }}
              value={formData.screenHeight}
              onChange={(e) => handleInputChange('screenHeight', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select position</option>
              {SCREEN_HEIGHT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="What is your typical screen viewing distance?" required fieldId="screenDistance">
            <select
              id="screenDistance"
              ref={(el) => { fieldRefs.current['screenDistance'] = el; }}
              value={formData.screenDistance}
              onChange={(e) => handleInputChange('screenDistance', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select distance</option>
              {SCREEN_DISTANCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>

          <FormField label="What is the lighting condition of your room?" required fieldId="roomLighting">
            <select
              id="roomLighting"
              ref={(el) => { fieldRefs.current['roomLighting'] = el; }}
              value={formData.roomLighting}
              onChange={(e) => handleInputChange('roomLighting', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select lighting</option>
              {ROOM_LIGHTING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FormField>
        </FormSection>
      )}

      {/* Section 6: Additional Information */}
      {currentSection === 6 && (
        <FormSection>
          <SectionHeader number={6} title="ADDITIONAL INFORMATION" />

          <FormField label="Average Sleep Hours per Night" required fieldId="sleepHours">
            <input
              id="sleepHours"
              ref={(el) => { fieldRefs.current['sleepHours'] = el; }}
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              max="24"
              value={formData.sleepHours || ''}
              onChange={(e) => {
                handleInputChange('sleepHours', e.target.value);
              }}
              placeholder="e.g., 7.5"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              autoComplete="off"
            />
          </FormField>

          <FormField label="Screen Brightness Level" required fieldId="screenBrightness">
            <div className="space-y-4">
              <input
                id="screenBrightness"
                ref={(el) => { fieldRefs.current['screenBrightness'] = el; }}
                type="range"
                min="0"
                max="100"
                value={formData.screenBrightness}
                onChange={(e) => handleInputChange('screenBrightness', e.target.value)}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">0%</span>
                <span className="text-sm font-medium text-foreground">{formData.screenBrightness}%</span>
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {parseInt(formData.screenBrightness) <= 30 && 'Very low brightness'}
                {parseInt(formData.screenBrightness) > 30 && parseInt(formData.screenBrightness) <= 60 && 'Low to medium brightness'}
                {parseInt(formData.screenBrightness) > 60 && parseInt(formData.screenBrightness) <= 80 && 'Medium to high brightness'}
                {parseInt(formData.screenBrightness) > 80 && 'Very high brightness'}
              </p>
            </div>
          </FormField>

          <FormField label="Additional Notes or Comments" fieldId="additionalNotes">
            <textarea
              value={formData.additionalNotes || ''}
              onChange={(e) => {
                handleInputChange('additionalNotes', e.target.value);
              }}
              placeholder="Any additional information about your eye health, work environment, or daily habits that might be relevant..."
              rows={5}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoComplete="off"
            />
          </FormField>
        </FormSection>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-6">
        {currentSection > 1 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handlePrevious}
            className="flex-1"
          >
            Previous
          </Button>
        )}
        {currentSection < 6 ? (
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="flex-1"
          >
            Next
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Analyzing...' : 'Submit Survey'}
          </Button>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-2 justify-center pt-4">
        {[1, 2, 3, 4, 5, 6].map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => {
              if (section < currentSection || validateSection(currentSection) === null) {
                setCurrentSection(section);
              }
            }}
            className={`w-3 h-3 rounded-full transition-all ${
              section === currentSection
                ? 'bg-primary w-8'
                : section < currentSection
                  ? 'bg-primary'
                  : 'bg-muted'
            }`}
            aria-label={`Go to section ${section}`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-4">
        Estimated time: 3-5 minutes. Your responses are anonymous and used only for research purposes.
      </p>
    </form>
  );
}
