use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyForecast {
    pub hour: u32,
    pub time_str: String,
    pub alertness_score: f64,
    pub status: String,
    pub eva_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct AnomalyAlert {
    pub id: String,
    pub metric: String,
    pub level: String, // "CRITICAL", "WARNING", "NOMINAL"
    pub value: String,
    pub title: String,
    pub description: String,
    pub recommendation: String,
    pub standard_ref: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FatigueModelOutput {
    pub average_alertness: f64,
    pub min_alertness: f64,
    pub peak_alertness: f64,
    pub cumulative_sleep_debt_hours: f64,
    pub eva_readiness_score: f64,
    pub eva_recommendation: String,
    pub hourly_forecast: Vec<HourlyForecast>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationInput {
    pub baseline_sleep_hours: f64,
    pub sleep_quality: f64,
    pub add_nap: bool,
    pub add_exercise: bool,
    pub add_light_therapy: bool,
}

pub fn calculate_fatigue_forecast(input: SimulationInput) -> FatigueModelOutput {
    let sleep_debt = (8.0 - input.baseline_sleep_hours).max(0.0);
    let quality_factor = (input.sleep_quality / 5.0).clamp(0.4, 1.0);
    
    // Base sleep recovery score
    let base_recovery = (input.baseline_sleep_hours / 8.0).clamp(0.0, 1.2) * 100.0 * quality_factor;

    let mut hourly_forecast = Vec::new();
    let mut sum_alertness = 0.0;
    let mut min_alertness = 100.0;
    let mut peak_alertness = 0.0;

    for hour in 0..24 {
        // Circadian Process C: 24h wave peaking at 16:00 (hour 16), trough at 04:00
        let c_phase = ((hour as f64 - 16.0) * std::f64::consts::PI / 12.0).cos();
        let circadian_component = c_phase * 15.0; // +/- 15% circadian swing

        // Homeostatic Process S: decay from wake (assume wake at 06:00)
        let hours_awake = if hour >= 6 {
            (hour - 6) as f64
        } else {
            (hour + 18) as f64
        };
        let homeostatic_decay = hours_awake * 1.8;

        let mut score = base_recovery + circadian_component - homeostatic_decay;

        // Apply countermeasure effects
        if input.add_nap && hour >= 14 && hour <= 18 {
            score += 12.0; // Post-nap alertness boost
        }
        if input.add_exercise && hour >= 9 && hour <= 12 {
            score += 8.0; // Exercise boost
        }
        if input.add_light_therapy && hour >= 7 && hour <= 11 {
            score += 10.0; // Circadian phase alignment light boost
        }

        let clamped_score = score.clamp(20.0, 99.0).round();
        sum_alertness += clamped_score;
        if clamped_score < min_alertness { min_alertness = clamped_score; }
        if clamped_score > peak_alertness { peak_alertness = clamped_score; }

        let status = if hour >= 23 || hour <= 5 {
            "Sleep Phase".to_string()
        } else if clamped_score >= 88.0 {
            "Peak Alertness".to_string()
        } else if clamped_score >= 75.0 {
            "Nominal Alertness".to_string()
        } else if clamped_score >= 60.0 {
            "Moderate Fatigue".to_string()
        } else {
            "Critical Fatigue".to_string()
        };

        let eva_status = if clamped_score >= 85.0 && hour >= 8 && hour <= 20 {
            "GO FOR EVA".to_string()
        } else if clamped_score >= 70.0 {
            "CONDITIONAL".to_string()
        } else {
            "NO-GO".to_string()
        };

        hourly_forecast.push(HourlyForecast {
            hour,
            time_str: format!("{:02}:00", hour),
            alertness_score: clamped_score,
            status,
            eva_status,
        });
    }

    let avg = (sum_alertness / 24.0).round();
    let eva_score = (avg * 1.05 - sleep_debt * 4.0).clamp(10.0, 98.0).round();
    
    let eva_recommendation = if eva_score >= 85.0 {
        "CREW EVA READINESS: GO - Optimal physiological reserve for spacewalk / robotics operations."
    } else if eva_score >= 70.0 {
        "CREW EVA READINESS: CAUTION - Implement 45m countermeasure nap prior to airlock depress."
    } else {
        "CREW EVA READINESS: NO-GO - Significant cumulative fatigue. Reassign critical EVA tasks."
    }.to_string();

    FatigueModelOutput {
        average_alertness: avg,
        min_alertness,
        peak_alertness,
        cumulative_sleep_debt_hours: sleep_debt,
        eva_readiness_score: eva_score,
        eva_recommendation,
        hourly_forecast,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fatigue_forecast_optimal_sleep() {
        let input = SimulationInput {
            baseline_sleep_hours: 8.0,
            sleep_quality: 5.0,
            add_nap: false,
            add_exercise: true,
            add_light_therapy: false,
        };
        let output = calculate_fatigue_forecast(input);
        assert_eq!(output.cumulative_sleep_debt_hours, 0.0);
        assert_eq!(output.hourly_forecast.len(), 24);
        assert!(output.average_alertness >= 75.0);
        assert!(output.peak_alertness >= 85.0);
    }

    #[test]
    fn test_fatigue_forecast_sleep_deprived() {
        let input = SimulationInput {
            baseline_sleep_hours: 4.0,
            sleep_quality: 2.0,
            add_nap: false,
            add_exercise: false,
            add_light_therapy: false,
        };
        let output = calculate_fatigue_forecast(input);
        assert_eq!(output.cumulative_sleep_debt_hours, 4.0);
        assert!(output.eva_readiness_score < 70.0);
        assert!(output.eva_recommendation.contains("NO-GO"));
    }

    #[test]
    fn test_countermeasures_boost_alertness() {
        let base = calculate_fatigue_forecast(SimulationInput {
            baseline_sleep_hours: 6.0,
            sleep_quality: 3.0,
            add_nap: false,
            add_exercise: false,
            add_light_therapy: false,
        });

        let boosted = calculate_fatigue_forecast(SimulationInput {
            baseline_sleep_hours: 6.0,
            sleep_quality: 3.0,
            add_nap: true,
            add_exercise: true,
            add_light_therapy: true,
        });

        assert!(boosted.average_alertness > base.average_alertness);
    }
}
