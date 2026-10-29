import math

def calculate_recovery_plan(attended, conducted, target_percentage=75.0):
    """
    Calculates attendance metrics, recovery requirements, safe absences,
    and recommendations strictly adhering to Phase 5 specifications.

    Let:
      A = number of classes attended
      C = total number of classes conducted
      T = required attendance percentage expressed as a decimal (e.g. 0.75)

    Attendance Percentage = (A / C) * 100 (when C > 0)

    If C > 0:
      N = max(0, ceil((T * C - A) / (1 - T)))
      (When T == 1.0, any missed class makes 100% impossible unless A == C).

    Safe absence calculation:
      If current attendance >= target:
        Max additional classes student can miss (M) while (A / (C + M)) >= T
        => A >= T * C + T * M
        => T * M <= A - T * C
        => M = floor((A - T * C) / T) = floor(A / T - C)
      If current attendance < target:
        Safe absences = 0
    """
    target_pct = float(target_percentage)
    T = target_pct / 100.0
    missed = max(0, conducted - attended)

    if conducted == 0:
        return {
            'classes_conducted': 0,
            'classes_attended': 0,
            'classes_missed': 0,
            'current_percentage': 0.0,
            'required_percentage': target_pct,
            'status': 'no_data', # 'no_data', 'above_target', 'at_target', 'below_target', 'critical'
            'badge_color': 'gray',
            'required_future_classes': 0,
            'safe_absences': 0,
            'projected_percentage_after_recovery': 0.0,
            'recommendation': 'Attendance information is not available yet.'
        }

    current_pct = round((attended / conducted) * 100, 2)

    # Recovery classes calculation
    if current_pct >= target_pct:
        required_future = 0
        projected_pct = current_pct
        if current_pct == target_pct:
            status = 'at_target'
            badge_color = 'amber'
        else:
            status = 'above_target'
            badge_color = 'green'

        # Safe absences: floor((attended - T * conducted) / T)
        if T > 0:
            safe_absences = max(0, math.floor((attended - (T * conducted)) / T))
        else:
            safe_absences = 0

        recommendation = "Your attendance is currently above the required percentage."
    else:
        # Below target
        if T >= 1.0:
            # If target is 100% and attended < conducted, 100% is mathematically impossible
            required_future = 0
            is_impossible = True
        else:
            # N = max(0, ceiling((T * C - A) / (1 - T)))
            numerator = (T * conducted) - attended
            denominator = 1.0 - T
            val = numerator / denominator
            # Use small epsilon to prevent precision drift
            required_future = max(0, math.ceil(round(val, 6)))
            is_impossible = False

        safe_absences = 0

        if is_impossible:
            projected_pct = current_pct
            status = 'critical'
            badge_color = 'red'
            recommendation = "Target is 100%, but classes have already been missed. Target cannot be reached."
        else:
            new_attended = attended + required_future
            new_conducted = conducted + required_future
            projected_pct = round((new_attended / new_conducted) * 100, 2) if new_conducted > 0 else 0.0

            # If difference is big or current_pct is very low (< 60%)
            if current_pct < 60.0 or required_future > 15:
                status = 'critical'
                badge_color = 'red'
                recommendation = f"Your attendance is below the required level. You need to attend the next {required_future} consecutive classes to reach the target, assuming no additional absences. Review your upcoming classes and contact your faculty if necessary."
            else:
                status = 'below_target'
                badge_color = 'amber'
                recommendation = f"You need to attend the next {required_future} consecutive classes to reach the target, assuming no additional absences."

    return {
        'classes_conducted': conducted,
        'classes_attended': attended,
        'classes_missed': missed,
        'current_percentage': current_pct,
        'required_percentage': target_pct,
        'status': status,
        'badge_color': badge_color,
        'required_future_classes': required_future,
        'safe_absences': safe_absences,
        'projected_percentage_after_recovery': projected_pct,
        'recommendation': recommendation
    }

