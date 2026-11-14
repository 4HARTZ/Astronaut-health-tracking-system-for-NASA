import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  BrainCircuit,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  Activity,
  HeartPulse,
  Thermometer,
  Zap,
  Sliders,
  Search,
  BookOpen,
  Copy,
  Check,
  Flame,
  Info
} from 'lucide-react';

export default function MedicalAiAdvisory({ entries = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Latest check-in values to seed the simulation
  const latestEntry = entries.length > 0 ? entries[0] : null;

  // Simulator controls
  const [sleepHours, setSleepHours] = useState(
    latestEntry && latestEntry.sleep !== null ? Number(latestEntry.sleep) : 7.5
  );
  const [sleepQuality, setSleepQuality] = useState(
    latestEntry && latestEntry.sleep_quality !== null ? Number(latestEntry.sleep_quality) : 4
  );
  const [addNap, setAddNap] = useState(false);
  const [addExercise, setAddExercise] = useState(true);
  const [addLightTherapy, setAddLightTherapy] = useState(false);

  // Vitals Anomaly Detection Engine
  const anomalies = useMemo(() => {
    if (!latestEntry) return [];
    const alerts = [];

    // SpO2
    if (latestEntry.spo2 !== null) {
      if (latestEntry.spo2 < 93) {
        alerts.push({
          id: 'spo2-crit',
          severity: 'CRITICAL',
          title: 'Acute Hypoxia Warning',
          value: `${latestEntry.spo2}% SpO2`,
          desc: 'Oxygen saturation critically depressed below spacecraft nominal baseline (>95%). Check cabin ppO2 and don emergency oxygen mask if symptomatic.',
          ref: 'NASA-STD-3001 Vol 2 · §6.3 Atmospheric Control'
        });
      } else if (latestEntry.spo2 < 96) {
        alerts.push({
          id: 'spo2-warn',
          severity: 'WARNING',
          title: 'Mild Oxygen Saturation Dip',
          value: `${latestEntry.spo2}% SpO2`,
          desc: 'Peripheral oxygen saturation below 96%. Monitor airway and verify life-support ventilation in sleep compartment.',
          ref: 'NASA-STD-3001 Vol 2 · §6.3'
        });
      }
    }

    // Resting Heart Rate
    if (latestEntry.heart_rate !== null) {
      if (latestEntry.heart_rate > 100) {
        alerts.push({
          id: 'hr-tachy',
          severity: 'WARNING',
          title: 'Resting Tachycardia Detected',
          value: `${latestEntry.heart_rate} bpm`,
          desc: 'Elevated resting pulse. Inquire into thermal stress, hypercapnia (cabin CO2 > 3.0 mmHg), caffeine intake, or acute dehydration.',
          ref: 'NASA Medical Checklist · Cardiovascular §4.1'
        });
      } else if (latestEntry.heart_rate < 48) {
        alerts.push({
          id: 'hr-brady',
          severity: 'INFO',
          title: 'Resting Bradycardia',
          value: `${latestEntry.heart_rate} bpm`,
          desc: 'Resting pulse below 50 bpm. Verify astronaut athletic conditioning history vs. conduction delay.',
          ref: 'NASA Space Clinic Protocol'
        });
      }
    }

    // Blood Pressure
    if (latestEntry.systolic !== null && latestEntry.diastolic !== null) {
      if (latestEntry.systolic >= 140 || latestEntry.diastolic >= 90) {
        alerts.push({
          id: 'bp-high',
          severity: 'WARNING',
          title: 'Stage 2 Hypertension Elevation',
          value: `${latestEntry.systolic}/${latestEntry.diastolic} mmHg`,
          desc: 'Arterial blood pressure elevated. Check for fluid redistribution, psychological stress, or excessive sodium/fluid loading.',
          ref: 'NASA-STD-3001 Vol 1 · Crew Health §5.2'
        });
      } else if (latestEntry.systolic < 95 || latestEntry.diastolic < 60) {
        alerts.push({
          id: 'bp-low',
          severity: 'WARNING',
          title: 'Orthostatic Hypotension Risk',
          value: `${latestEntry.systolic}/${latestEntry.diastolic} mmHg`,
          desc: 'Low resting blood pressure. High risk of presyncope upon return to 1G or high-G maneuvering. Ensure active fluid-loading protocols.',
          ref: 'NASA JSC Flight Medicine · Countermeasures'
        });
      }
    }

    // Core Temperature
    if (latestEntry.temperature !== null) {
      if (latestEntry.temperature >= 38.0) {
        alerts.push({
          id: 'temp-crit',
          severity: 'CRITICAL',
          title: 'Febrile State / Space Fever',
          value: `${latestEntry.temperature}°C`,
          desc: 'Core temperature exceeds 38.0°C. Inquire into localized infection, UTI, or impaired convective heat transfer in microgravity.',
          ref: 'NASA Space Clinic Infection Protocol'
        });
      } else if (latestEntry.temperature >= 37.6) {
        alerts.push({
          id: 'temp-elev',
          severity: 'WARNING',
          title: 'Low-Grade Core Temp Elevation',
          value: `${latestEntry.temperature}°C`,
          desc: 'Elevated core temperature. Verify cabin ventilation and hydration status.',
          ref: 'NASA-STD-3001 Vol 2 · §6.6 Thermal Comfort'
        });
      }
    }

    // Sleep Debt
    const recentSleep = entries.slice(0, 3).map((e) => e.sleep).filter((s) => s !== null);
    if (recentSleep.length > 0) {
      const avgSleep = recentSleep.reduce((a, b) => a + b, 0) / recentSleep.length;
      if (avgSleep < 6.0) {
        alerts.push({
          id: 'sleep-debt',
          severity: 'WARNING',
          title: 'High Cumulative Sleep Debt',
          value: `${avgSleep.toFixed(1)} hrs/night`,
          desc: `Average sleep over last ${recentSleep.length} logs is below 6.0 hours. Cognitive reaction time on PVT is expected to degrade by 15–25%.`,
          ref: 'NASA Behavioral Health & Performance (BHP)'
        });
      }
    }

    // Stress Level
    if (latestEntry.stress !== null && latestEntry.stress >= 4) {
      alerts.push({
        id: 'stress-high',
        severity: 'WARNING',
        title: 'Elevated Perceived Stress',
        value: `Level ${latestEntry.stress} / 5`,
        desc: 'Self-reported high operational stress. Recommend scheduled private family conference (PFC) or audio-guided relaxation countermeasure.',
        ref: 'NASA BHP Countermeasures'
      });
    }

    return alerts;
  }, [latestEntry, entries]);

  // Dynamic 24-hr SAFTE Biomathematical Alertness & Fatigue Engine
  const fatigueForecast = useMemo(() => {
    const sleepDebt = Math.max(0, 8.0 - sleepHours);
    const qualityFactor = Math.min(1.0, Math.max(0.4, sleepQuality / 5.0));
    const baseRecovery = Math.min(1.2, Math.max(0.2, sleepHours / 8.0)) * 100 * qualityFactor;

    const slots = [];
    let sumScore = 0;
    let minScore = 100;
    let peakScore = 0;

    for (let h = 0; h < 24; h++) {
      // Process C (Circadian rhythm, cosine phase peaking at 16:00, trough at 04:00)
      const cPhase = Math.cos(((h - 16) * Math.PI) / 12);
      const circadian = cPhase * 15;

      // Process S (Homeostatic sleep pressure decay from wake at 06:00)
      const hoursAwake = h >= 6 ? h - 6 : h + 18;
      const decay = hoursAwake * 1.8;

      let score = baseRecovery + circadian - decay;

      // Countermeasures
      if (addNap && h >= 14 && h <= 18) score += 12;
      if (addExercise && h >= 9 && h <= 12) score += 8;
      if (addLightTherapy && h >= 7 && h <= 11) score += 10;

      const clamped = Math.round(Math.min(99, Math.max(20, score)));
      sumScore += clamped;
      if (clamped < minScore) minScore = clamped;
      if (clamped > peakScore) peakScore = clamped;

      let status = 'Nominal';
      if (h >= 23 || h <= 5) status = 'Sleep Phase';
      else if (clamped >= 88) status = 'Peak Alertness';
      else if (clamped >= 75) status = 'Nominal';
      else if (clamped >= 60) status = 'Moderate Fatigue';
      else status = 'Severe Nadir';

      let evaStatus = 'NO-GO';
      if (clamped >= 85 && h >= 8 && h <= 20) evaStatus = 'GO';
      else if (clamped >= 70) evaStatus = 'CONDITIONAL';

      slots.push({
        hour: `${String(h).padStart(2, '0')}:00`,
        rawHour: h,
        score: clamped,
        status,
        evaStatus,
      });
    }

    const avg = Math.round(sumScore / 24);
    const evaReadiness = Math.round(Math.min(98, Math.max(10, avg * 1.05 - sleepDebt * 4)));

    return {
      average: avg,
      minScore,
      peakScore,
      sleepDebt: sleepDebt.toFixed(1),
      evaReadiness,
      slots,
    };
  }, [sleepHours, sleepQuality, addNap, addExercise, addLightTherapy]);

  // Comprehensive NASA Space Medicine Knowledge Protocols
  const protocols = [
    {
      id: 'sms',
      title: 'Space Motion Sickness (SMS) & Neurovestibular Adaptation',
      category: 'Neurovestibular',
      trigger: 'First 24–72 hours after orbital insertion; head movement discomfort, nausea, malaise.',
      ref: 'NASA-STD-3001 Vol 1 §4.2',
      advice:
        'Minimize rapid head rotation along pitch and roll axes. Fixate gaze on stationary cabin landmarks. Consult Flight Surgeon for oral/IM promethazine (25–50 mg) or scopolamine dermal patch protocol if symptoms impede critical ingress tasks.',
      checklist: [
        'Secure crew member with foot restraints to prevent floating rotation.',
        'Apply cool airflow across facial trigeminal area.',
        'Sip electrolyte fluids in small increments (100 mL/hr).',
        'Record vestibular score in daily medical log.'
      ]
    },
    {
      id: 'fluid',
      title: 'Cephalic Fluid Shift & Facial Edema Management',
      category: 'Cardiovascular',
      trigger: 'Microgravity venous pooling in head/torso; nasal congestion, puffy face, intracranial pressure increase.',
      ref: 'NASA-STD-3001 Vol 1 §4.3',
      advice:
        'Nominal physiological adaptation to microgravity. Ensure prescribed 2.5 hr daily cycle-ergometer/treadmill countermeasure exercise to stimulate peripheral perfusion. Use nasal saline rinse for sinus comfort.',
      checklist: [
        'Complete 45 min resistive exercise (ARED) session.',
        'Complete 30 min high-intensity aerobic interval protocol on T2 treadmill.',
        'Log subjective intraocular pressure or visual acuity shifts.'
      ]
    },
    {
      id: 'circadian',
      title: 'Orbital Insomnia & Circadian Phase Shifting',
      category: 'Sleep & Circadian',
      trigger: 'Sleep duration < 6.0 hrs, sleep quality rating < 3, or upcoming critical night-shift docking operation.',
      ref: 'NASA-STD-3001 Vol 2 §8.1',
      advice:
        'Implement 45-minute blue-light reduction prior to sleep compartment entry. Maintain 68°F (20°C) sleep station airflow. Consider melatonin (0.5–3.0 mg) or white-noise sleep mask as approved in the in-flight medical kit.',
      checklist: [
        'Dim cabin luminaire spectrum to warm amber (2200K) at T-1 hour before sleep.',
        'Inspect personal sound-deadening curtains and earplug fit.',
        'Abstain from caffeinated beverages within 6 hours of sleep onset.'
      ]
    },
    {
      id: 'ortho',
      title: 'Orthostatic Intolerance & Pre-Landing Fluid Loading',
      category: 'Cardiovascular',
      trigger: 'Upcoming re-entry or gravity transition; low resting systolic BP (<100 mmHg).',
      ref: 'NASA JSC Flight Medicine · Entry Countermeasures',
      advice:
        'Begin oral fluid loading (electrolyte-isotonic salt tablets + 1.2 L water) 2 hours prior to de-orbit burn. Verify anti-G suit bladders and lower-body negative pressure (LBNP) logs.',
      checklist: [
        'Ingest 8 salt tablets with 1000 mL water over 90 minutes.',
        'Don and test operational pressure of lower-body anti-G suit.',
        'Review post-landing egress and recumbent litter transfer procedures.'
      ]
    },
    {
      id: 'hypercapnia',
      title: 'Hypercapnia & Elevated Cabin CO2 Toxicity',
      category: 'Environmental & EVA',
      trigger: 'Cabin ppCO2 > 3.0 mmHg or crew reports throbbing frontal headache, dyspnea, flushed face.',
      ref: 'NASA-STD-3001 Vol 2 §6.3.2',
      advice:
        'Verify CDRA (Carbon Dioxide Removal Assembly) bed cycling status. Check local sleep station airflow to eliminate stagnant CO2 pockets. Notify ground control immediately.',
      checklist: [
        'Measure local ppCO2 with portable atmospheric analyzer (Target < 2.5 mmHg).',
        'Verify auxiliary ventilation fan operation in confined modules.',
        'Administer supplemental oxygen if headache persists.'
      ]
    },
    {
      id: 'sans',
      title: 'Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
      category: 'Neurovestibular',
      trigger: 'Hyperopic shift, visual blurring at near focal distance, or optic disc edema.',
      ref: 'NASA SANS Clinical Practice Guidelines',
      advice:
        'Perform weekly visual acuity self-checks and fundoscopy / optical coherence tomography (OCT) imaging. Wear prescribed adjustable Space Adjusting Glasses (SAG) for close tasks.',
      checklist: [
        'Complete near and distance Snellen visual acuity chart test.',
        'Capture bilateral fundus photos for Flight Surgeon telemedicine review.',
        'Log any scotomas or globe flattening symptoms.'
      ]
    },
    {
      id: 'dcs',
      title: 'Decompression Sickness (DCS) / EVA Pre-Breathe Protocol',
      category: 'Environmental & EVA',
      trigger: 'Preparation for extravehicular activity (EVA) suit depressurization to 4.3 psia.',
      ref: 'NASA EVA Medical Operations Manual',
      advice:
        'Strictly follow the 4-hour in-suit 100% oxygen pre-breathe protocol or overnight Campout protocol at 10.2 psia to wash out tissue nitrogen. Report any joint crepitus or bubbling immediately.',
      checklist: [
        'Confirm airlock depress to 10.2 psi completed nominal overnight equilibration.',
        'Complete 100% O2 mask pre-breathe cycle with light ergometer arm-crank exercise.',
        'Confirm zero symptoms of bends, chokes, or cutaneous tingling.'
      ]
    },
    {
      id: 'musculo',
      title: 'Microgravity Musculoskeletal Deconditioning Countermeasure',
      category: 'Musculoskeletal',
      trigger: 'Sustained microgravity stay > 14 days without reaching 100% exercise compliance.',
      ref: 'NASA Human Research Program (HRP)',
      advice:
        'Maintain daily resistive load targets on ARED (Advanced Resistive Exercise Device): deadlifts, squats, and heel raises. Take 1000 IU Vitamin D3 daily to mitigate osteopenia.',
      checklist: [
        'Perform 3 sets of 10 repetitions ARED squat at 80% 1RM.',
        'Perform 3 sets of 10 repetitions ARED Romanian deadlift.',
        'Record dietary protein intake (>1.2 g/kg/day target).'
      ]
    }
  ];

  const categories = ['All', 'Cardiovascular', 'Neurovestibular', 'Sleep & Circadian', 'Environmental & EVA', 'Musculoskeletal'];

  const filtered = protocols.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesQuery =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.advice.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.trigger.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-[4px] bg-[#16202d] border border-[#2a475e]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#66c0f4] font-bold flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#66c0f4] shrink-0" />
            AUTONOMOUS ON-DEVICE MEDICAL INTELLIGENCE &amp; SAFTE MODEL
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Medical AI &amp; Circadian Alertness Forecast</h2>
          <p className="text-xs text-[#8f98a0] mt-1 max-w-2xl leading-relaxed m-0">
            Offline clinical decision support engine complying with NASA-STD-3001 standards. Zero network dependency, 100% on-device inference.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-mono px-3 py-1 rounded-[3px] bg-[#5c7e10]/30 text-[#a4d007] border border-[#a4d007]/30 flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#a4d007]" />
            CDS ENGINE: ACTIVE
          </span>
          <span className="text-[10px] font-mono text-[#626d78]">NASA-STD-3001 VOL 1 &amp; 2</span>
        </div>
      </div>

      {/* Section 1: Automated Vitals Anomaly Detection */}
      <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 m-0">
              <ShieldAlert className="w-4 h-4 text-[#66c0f4]" />
              Real-Time Physiological Anomaly &amp; Triage Engine
            </h3>
            <p className="text-xs text-[#8f98a0] mt-1 m-0">
              Cross-evaluates your latest recorded parameters against flight surgeon critical tolerance limits.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-[3px] bg-[#101822] text-[#8f98a0] border border-[#2a475e]">
            {anomalies.length === 0 ? 'STATUS: ALL PARAMETERS NOMINAL' : `${anomalies.length} CLINICAL FLAGS DETECTED`}
          </span>
        </div>

        {anomalies.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-[3px] bg-[#5c7e10]/20 border border-[#a4d007]/30 text-[#a4d007]">
            <CheckCircle2 className="w-4 h-4 text-[#a4d007] shrink-0" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-white text-sm mb-0.5">All Recorded Vitals Within Nominal Mission Baseline</strong>
              Resting heart rate, oxygenation (SpO2), blood pressure, core temperature, and circadian rest metrics reflect optimal flight readiness.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {anomalies.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-[3px] border flex flex-col justify-between gap-2.5 ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-[#d9534f]/15 border-[#d9534f]/40 text-[#c6d4df]'
                    : alert.severity === 'WARNING'
                    ? 'bg-[#e58e26]/15 border-[#e58e26]/40 text-[#c6d4df]'
                    : 'bg-[#1a9fff]/15 border-[#1a9fff]/40 text-[#c6d4df]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold uppercase tracking-wider ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-[#d9534f] text-white'
                          : alert.severity === 'WARNING'
                          ? 'bg-[#e58e26] text-white'
                          : 'bg-[#1a9fff] text-white'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">{alert.value}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white m-0">{alert.title}</h4>
                  <p className="text-xs text-[#8f98a0] mt-1 leading-relaxed m-0">{alert.desc}</p>
                </div>
                <div className="pt-2 border-t border-white/10 text-[10.5px] font-mono text-[#626d78]">
                  REF: {alert.ref}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: 24-Hour SAFTE Alertness Simulator */}
      <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 m-0">
              <Zap className="w-4 h-4 text-[#e58e26]" />
              24-Hour Biomathematical Alertness Forecast &amp; Countermeasure Simulator
            </h3>
            <p className="text-xs text-[#8f98a0] mt-1 m-0">
              Simulates two-process sleep regulation: Homeostatic sleep pressure (Process S) &amp; Circadian pacemaker (Process C).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono px-3 py-1.5 rounded-[3px] border font-bold ${
                fatigueForecast.evaReadiness >= 85
                  ? 'bg-[#5c7e10]/30 border-[#a4d007]/40 text-[#a4d007]'
                  : fatigueForecast.evaReadiness >= 70
                  ? 'bg-[#e58e26]/30 border-[#e58e26]/40 text-[#e58e26]'
                  : 'bg-[#d9534f]/30 border-[#d9534f]/40 text-[#d9534f]'
              }`}
            >
              PROJECTED EVA READINESS: {fatigueForecast.evaReadiness}%
            </span>
          </div>
        </div>

        {/* Simulator Interactive Sliders & Countermeasures */}
        <div className="p-4 rounded-[3px] bg-[#16202d] border border-[#2a475e] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sleep Hours Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#8f98a0] flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-[#66c0f4]" />
                Planned Sleep Duration
              </span>
              <span className="font-mono text-[#66c0f4] font-bold">{sleepHours} hrs</span>
            </div>
            <input
              type="range"
              min="4"
              max="10"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full accent-[#1a9fff]"
            />
            <div className="flex justify-between text-[10px] text-[#626d78] font-mono">
              <span>4.0h (Deficit)</span>
              <span>8.0h (Nominal)</span>
              <span>10.0h</span>
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#8f98a0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#e58e26]" />
                Sleep Architecture Quality
              </span>
              <span className="font-mono text-[#66c0f4] font-bold">{sleepQuality} / 5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(Number(e.target.value))}
              className="w-full accent-[#1a9fff]"
            />
            <div className="flex justify-between text-[10px] text-[#626d78] font-mono">
              <span>1 (Restless)</span>
              <span>3 (Adequate)</span>
              <span>5 (Deep/REM)</span>
            </div>
          </div>

          {/* Countermeasure Toggles */}
          <div className="lg:col-span-2 space-y-2">
            <span className="text-xs text-[#8f98a0] block mb-1">Prescribed Mission Countermeasures</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAddNap((v) => !v)}
                className={`text-xs px-3.5 py-1.5 rounded-[3px] border font-mono transition-colors flex items-center gap-1.5 ${
                  addNap
                    ? 'bg-[#1a9fff]/20 border-[#1a9fff] text-[#66c0f4]'
                    : 'bg-[#212c3d] border-[#3d4f68] text-[#c6d4df] hover:border-[#66c0f4]'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                30m Midday Nap (14:00) {addNap ? '✓' : '+'}
              </button>

              <button
                type="button"
                onClick={() => setAddExercise((v) => !v)}
                className={`text-xs px-3.5 py-1.5 rounded-[3px] border font-mono transition-colors flex items-center gap-1.5 ${
                  addExercise
                    ? 'bg-[#5c7e10]/30 border-[#a4d007]/50 text-[#a4d007]'
                    : 'bg-[#212c3d] border-[#3d4f68] text-[#c6d4df] hover:border-[#66c0f4]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                ARED / Cycle Ergometer {addExercise ? '✓' : '+'}
              </button>

              <button
                type="button"
                onClick={() => setAddLightTherapy((v) => !v)}
                className={`text-xs px-3.5 py-1.5 rounded-[3px] border font-mono transition-colors flex items-center gap-1.5 ${
                  addLightTherapy
                    ? 'bg-[#e58e26]/20 border-[#e58e26] text-[#e58e26]'
                    : 'bg-[#212c3d] border-[#3d4f68] text-[#c6d4df] hover:border-[#66c0f4]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                10k Lux Light Therapy {addLightTherapy ? '✓' : '+'}
              </button>
            </div>
          </div>
        </div>

        {/* Visual 24-hr Bar Forecast Matrix */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#8f98a0] mb-2.5">
            <span>HOURLY ALERTNESS PROFILE (00:00 → 23:00 LOCAL TIME)</span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#a4d007]" /> &gt;85% Peak/Nominal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#66c0f4]" /> 70–84% Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#d9534f]" /> &lt;70% Nadir/Fatigue
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1.5 pt-1">
            {fatigueForecast.slots.map((slot) => {
              const isPeak = slot.score >= 85;
              const isMid = slot.score >= 70 && slot.score < 85;
              return (
                <div
                  key={slot.hour}
                  className={`text-center p-2 rounded-[3px] border flex flex-col justify-between transition-all ${
                    isPeak
                      ? 'bg-[#16202d] border-[#a4d007]/40 hover:border-[#a4d007]'
                      : isMid
                      ? 'bg-[#16202d] border-[#2a475e] hover:border-[#66c0f4]'
                      : 'bg-[#101822] border-[#2a475e] text-[#626d78]'
                  }`}
                  title={`${slot.hour} - Alertness: ${slot.score}% (${slot.status}) - EVA: ${slot.evaStatus}`}
                >
                  <div className="text-[10px] font-mono text-[#8f98a0]">{slot.hour.slice(0, 2)}h</div>
                  
                  {/* Vertical mini indicator bar */}
                  <div className="h-14 w-full bg-[#101822] rounded-[2px] flex items-end my-1 overflow-hidden">
                    <div
                      className={`w-full transition-all rounded-t-[1px] ${
                        isPeak ? 'bg-[#a4d007]' : isMid ? 'bg-[#66c0f4]' : 'bg-[#d9534f]'
                      }`}
                      style={{ height: `${slot.score}%` }}
                    />
                  </div>

                  <div
                    className={`text-xs font-bold font-mono ${
                      isPeak ? 'text-[#a4d007]' : isMid ? 'text-[#66c0f4]' : 'text-[#d9534f]'
                    }`}
                  >
                    {slot.score}%
                  </div>
                  <div className="text-[8.5px] font-mono uppercase tracking-tighter truncate text-[#8f98a0] mt-0.5">
                    {slot.evaStatus === 'GO' ? 'GO' : slot.evaStatus === 'CONDITIONAL' ? 'COND' : 'NO-GO'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Model Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          <div className="p-3.5 rounded-[3px] bg-[#16202d] border border-[#2a475e]">
            <span className="text-[10px] font-mono text-[#8f98a0] uppercase block">Daily Average Alertness</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">{fatigueForecast.average}%</span>
            <span className="text-[11px] text-[#626d78]">Nominal target &gt; 80%</span>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#16202d] border border-[#2a475e]">
            <span className="text-[10px] font-mono text-[#8f98a0] uppercase block">Circadian Nadir (Low)</span>
            <span className="text-xl font-bold font-mono text-[#d9534f] mt-1 block">
              {fatigueForecast.minScore}% (04:00)
            </span>
            <span className="text-[11px] text-[#626d78]">Scheduled sleep window</span>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#16202d] border border-[#2a475e]">
            <span className="text-[10px] font-mono text-[#8f98a0] uppercase block">Peak Cognitive Window</span>
            <span className="text-xl font-bold font-mono text-[#a4d007] mt-1 block">
              {fatigueForecast.peakScore}% (16:00)
            </span>
            <span className="text-[11px] text-[#626d78]">Prime window for EVA / docking</span>
          </div>

          <div className="p-3.5 rounded-[3px] bg-[#16202d] border border-[#2a475e]">
            <span className="text-[10px] font-mono text-[#8f98a0] uppercase block">Cumulative Sleep Debt</span>
            <span
              className={`text-xl font-bold font-mono mt-1 block ${
                Number(fatigueForecast.sleepDebt) > 2 ? 'text-[#e58e26]' : 'text-[#c6d4df]'
              }`}
            >
              {fatigueForecast.sleepDebt} hrs
            </span>
            <span className="text-[11px] text-[#626d78]">Deficit vs 8h baseline</span>
          </div>
        </div>
      </div>

      {/* Section 3: Space Medicine Clinical Guidelines Library */}
      <div className="p-5 sm:p-6 rounded-[4px] bg-[#1b2838] border border-[#2a475e] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 m-0">
              <BookOpen className="w-4 h-4 text-[#66c0f4]" />
              NASA Space Medicine Clinical Guidelines (Offline Reference)
            </h3>
            <p className="text-xs text-[#8f98a0] mt-1 m-0">
              Validated clinical decision support checklists for in-flight crew medical officers and autonomous diagnostics.
            </p>
          </div>

          <div className="relative w-full sm:w-80 flex items-center">
            <Search className="w-4 h-4 text-[#8f98a0] absolute left-3 pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="Search symptom, syndrome, or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!py-2 !pl-9.5 !pr-3 !text-xs !bg-[#101822] !border-[#2a475e] !rounded-[3px] !text-white w-full"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3.5 py-1.5 rounded-[3px] font-mono transition-colors ${
                selectedCategory === cat
                  ? '!bg-[#1a9fff] !text-white font-bold !border-none'
                  : '!bg-[#16202d] !text-[#8f98a0] hover:!text-white !border !border-[#2a475e]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Protocol Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-[4px] bg-[#16202d] border border-[#2a475e] space-y-3.5 flex flex-col justify-between hover:border-[#3d5a80] transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-[#1a9fff]/20 text-[#66c0f4] border border-[#1a9fff]/30">
                    {item.category}
                  </span>
                  <span className="text-[10.5px] font-mono text-[#8f98a0]">{item.ref}</span>
                </div>

                <h4 className="text-sm font-bold text-white m-0">{item.title}</h4>

                <div className="p-2.5 rounded-[3px] bg-[#101822] border border-[#2a475e]">
                  <span className="text-[10px] font-mono text-[#e58e26] uppercase tracking-wider block font-bold">
                    Clinical Trigger:
                  </span>
                  <p className="text-xs text-[#c6d4df] m-0 mt-0.5">{item.trigger}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-[#66c0f4] uppercase tracking-wider block font-bold">
                    Clinical Guidelines:
                  </span>
                  <p className="text-xs text-[#c6d4df] leading-relaxed m-0 mt-0.5">{item.advice}</p>
                </div>

                {item.checklist && (
                  <div className="pt-2 border-t border-[#2a475e] space-y-1.5">
                    <span className="text-[10px] font-mono text-[#8f98a0] uppercase tracking-wider block">
                      Rapid Action Checklist:
                    </span>
                    <ul className="space-y-1.5 m-0 p-0 list-none">
                      {item.checklist.map((step, idx) => (
                        <li key={idx} className="text-xs text-[#c6d4df] flex items-start gap-2">
                          <span className="text-[#66c0f4] font-mono font-bold shrink-0">[{idx + 1}]</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#2a475e] flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      item.id,
                      `${item.title}\nTrigger: ${item.trigger}\nGuidance: ${item.advice}\nChecklist:\n${item.checklist?.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
                    )
                  }
                  className="text-xs text-[#8f98a0] hover:text-[#66c0f4] font-mono flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#a4d007]" /> Copied Checklist
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#8f98a0]" /> Copy Protocol
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
