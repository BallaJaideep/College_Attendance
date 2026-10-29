import unittest
from recovery_planner import calculate_recovery_plan

class TestRecoveryPlanner(unittest.TestCase):
    def test_phase5_official_example(self):
        # 36 out of 50 classes attended, target 75%
        res = calculate_recovery_plan(36, 50, 75.0)
        self.assertEqual(res['current_percentage'], 72.0)
        self.assertEqual(res['required_future_classes'], 6)
        self.assertEqual(res['projected_percentage_after_recovery'], 75.0)
        self.assertEqual(res['safe_absences'], 0)
        print("Phase 5 example passed: 36/50 (72%) requires 6 consecutive classes to reach 75%.")

    def test_above_threshold_safe_absences(self):
        # 46 out of 50 classes attended, target 75%
        # 46 / (50 + M) >= 0.75 => 46 >= 37.5 + 0.75M => 0.75M <= 8.5 => M = 11
        # Verification: (46) / (50 + 11) = 46 / 61 = 75.4% >= 75%
        # If 12: 46 / 62 = 74.19% < 75%
        res = calculate_recovery_plan(46, 50, 75.0)
        self.assertEqual(res['current_percentage'], 92.0)
        self.assertEqual(res['required_future_classes'], 0)
        self.assertEqual(res['safe_absences'], 11)
        self.assertEqual(res['status'], 'above_target')
        print("Above threshold test passed: 46/50 (92%) allows 11 safe absences.")

    def test_zero_classes(self):
        res = calculate_recovery_plan(0, 0, 75.0)
        self.assertEqual(res['status'], 'no_data')
        self.assertEqual(res['required_future_classes'], 0)
        print("Zero classes test passed.")

    def test_target_100_percent(self):
        # Missed 1 class out of 10
        res = calculate_recovery_plan(9, 10, 100.0)
        self.assertEqual(res['status'], 'critical')
        self.assertIn("Target is 100%", res['recommendation'])
        print("Target 100% boundary test passed without division by zero.")

if __name__ == '__main__':
    unittest.main()

