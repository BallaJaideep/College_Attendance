import unittest
import json
from app import app, db, seed_demo_data

class TestAttendlyE2E(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()

    def test_01_admin_login(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'admin@college.edu',
            'password': 'Admin@123'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('access_token', data)
        self.assertEqual(data['user']['role'], 'admin')
        print("Admin login verified.")

    def test_02_faculty_login_and_classes(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'faculty@college.edu',
            'password': 'Faculty@123'
        })
        self.assertEqual(res.status_code, 200)
        token = res.get_json()['access_token']

        # Get assigned classes
        c_res = self.client.get('/api/faculty/classes', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(c_res.status_code, 200)
        assignments = c_res.get_json()['assignments']
        self.assertTrue(len(assignments) > 0)
        print(f"Faculty login and class assignments verified ({len(assignments)} assigned).")

    def test_03_student_recovery_plan(self):
        # Login as student Alex Rivera (36/50 classes in CS501)
        res = self.client.post('/api/auth/login', json={
            'email': 'student@college.edu',
            'password': 'Student@123'
        })
        self.assertEqual(res.status_code, 200)
        token = res.get_json()['access_token']

        plan_res = self.client.get('/api/student/recovery-plan', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(plan_res.status_code, 200)
        plans = plan_res.get_json()['plans']
        cs501 = next(p for p in plans if p['subject_code'] == 'CS501')
        self.assertEqual(cs501['classes_conducted'], 50)
        self.assertEqual(cs501['classes_attended'], 36)
        self.assertEqual(cs501['current_percentage'], 72.0)
        self.assertEqual(cs501['required_future_classes'], 6)
        self.assertEqual(cs501['projected_percentage_after_recovery'], 75.0)
        print("Alex Rivera CS501 recovery plan verified: 72% -> 6 consecutive classes -> 75% target.")

    def test_04_csv_export(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'student@college.edu',
            'password': 'Student@123'
        })
        token = res.get_json()['access_token']
        csv_res = self.client.get('/api/student/export-csv', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(csv_res.status_code, 200)
        self.assertTrue(csv_res.headers['Content-Type'].startswith('text/csv'))
        content = csv_res.get_data(as_text=True)
        self.assertIn("CS501", content)
        self.assertIn("Alex Rivera", content)
        print("Student CSV export verified.")

    def test_05_faculty_attendance_marking_and_prevention(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'faculty@college.edu',
            'password': 'Faculty@123'
        })
        token = res.get_json()['access_token']

        # Get students for class 1 and subject 1
        st_res = self.client.get('/api/faculty/students?class_id=1&subject_id=1', headers={'Authorization': f'Bearer {token}'})
        students = st_res.get_json()['students']

        # Mark attendance on a distinct future date: 2026-12-25
        import random
        test_date = f"2026-12-{random.randint(10, 28)}"
        att_payload = {
            'subject_id': 1,
            'class_id': 1,
            'attendance_date': test_date,
            'records': [{'student_id': s['student_id'], 'status': 'Present'} for s in students],
            'allow_correction': False
        }

        mark_res = self.client.post('/api/faculty/attendance', json=att_payload, headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(mark_res.status_code, 201)

        # Attempting duplicate marking on same date without allow_correction should yield 409 Conflict
        dup_res = self.client.post('/api/faculty/attendance', json=att_payload, headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(dup_res.status_code, 409)
        self.assertTrue(dup_res.get_json()['already_exists'])
        print("Faculty marking & duplicate collision guard verified.")

if __name__ == '__main__':
    unittest.main()
