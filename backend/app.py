import os
import io
import csv
from datetime import datetime, date
from functools import wraps
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

from models import (
    db, User, StudentProfile, FacultyProfile,
    Class, Subject, Enrollment, FacultyAssignment,
    AttendanceSession, AttendanceRecord
)
from recovery_planner import calculate_recovery_plan

load_dotenv()

app = Flask(__name__)

# Configurations
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-college-attendance-key-2026')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'default-jwt-secret-key-college')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///attendly.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

# ----------------- Role Required Decorator -----------------
def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            role = claims.get('role')
            if role not in allowed_roles:
                return jsonify({'error': f'Access forbidden: requires one of {allowed_roles} role(s)'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ----------------- PUBLIC ROUTES -----------------
@app.route('/api/public/classes', methods=['GET'])
def get_public_classes():
    """Public endpoint to fetch class options for student registration without authentication"""
    classes = Class.query.order_by(Class.department, Class.semester, Class.class_name).all()
    return jsonify({'classes': [c.to_dict() for c in classes]}), 200


# ----------------- AUTHENTICATION ROUTES -----------------
@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    Public student registration.
    Faculty and Admins cannot be created via public registration for security.
    """
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    roll_number = data.get('roll_number', '').strip().upper()
    department = data.get('department', '').strip()
    semester = data.get('semester')
    class_id = data.get('class_id')

    if not full_name or not email or not password or not roll_number or not department or not semester:
        return jsonify({'error': 'Please provide all required fields: full_name, email, password, roll_number, department, semester.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 409

    if StudentProfile.query.filter_by(roll_number=roll_number).first():
        return jsonify({'error': 'A student with this roll number already exists.'}), 409

    try:
        semester = int(semester)
    except ValueError:
        return jsonify({'error': 'Semester must be an integer.'}), 400

    new_user = User(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password),
        role='student'
    )
    db.session.add(new_user)
    db.session.flush()

    student_prof = StudentProfile(
        user_id=new_user.id,
        roll_number=roll_number,
        department=department,
        semester=semester,
        class_id=int(class_id) if class_id else None
    )
    db.session.add(student_prof)
    db.session.flush()

    # Automatically enroll student into subjects matching department and semester
    matching_subjects = Subject.query.filter_by(department=department, semester=semester).all()
    for sub in matching_subjects:
        enr = Enrollment(student_id=student_prof.id, subject_id=sub.id)
        db.session.add(enr)

    db.session.commit()

    return jsonify({
        'message': 'Registration successful! You can now log in.',
        'user': new_user.to_dict()
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Please enter both email and password.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            'role': user.role,
            'email': user.email,
            'name': user.full_name
        }
    )

    return jsonify({
        'message': 'Login successful.',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    return jsonify({'user': user.to_dict()}), 200


# ----------------- ADMIN ROUTES -----------------
@app.route('/api/admin/dashboard', methods=['GET'])
@role_required('admin')
def admin_dashboard():
    total_students = StudentProfile.query.count()
    total_faculty = FacultyProfile.query.count()
    total_subjects = Subject.query.count()
    total_classes = Class.query.count()
    total_sessions = AttendanceSession.query.count()
    total_records = AttendanceRecord.query.count()

    # Calculate overall college attendance percentage
    overall_percentage = 0.0
    if total_records > 0:
        present_count = AttendanceRecord.query.filter_by(status='Present').count()
        overall_percentage = round((present_count / total_records) * 100, 1)

    # Low attendance alert: find students with overall attendance < 75%
    # Fetch all students and their calculations
    students = StudentProfile.query.all()
    shortage_students = []
    for s in students:
        s_total = AttendanceRecord.query.filter_by(student_id=s.id).count()
        if s_total > 0:
            s_present = AttendanceRecord.query.filter_by(student_id=s.id, status='Present').count()
            pct = round((s_present / s_total) * 100, 1)
            if pct < 75.0:
                shortage_students.append({
                    'id': s.id,
                    'name': s.user.full_name,
                    'roll_number': s.roll_number,
                    'department': s.department,
                    'class_name': s.assigned_class.class_name if s.assigned_class else 'N/A',
                    'attended': s_present,
                    'total': s_total,
                    'percentage': pct
                })

    recent_sessions = AttendanceSession.query.order_by(AttendanceSession.attendance_date.desc(), AttendanceSession.id.desc()).limit(5).all()

    return jsonify({
        'stats': {
            'total_students': total_students,
            'total_faculty': total_faculty,
            'total_subjects': total_subjects,
            'total_classes': total_classes,
            'total_sessions': total_sessions,
            'overall_percentage': overall_percentage,
            'students_shortage_count': len(shortage_students)
        },
        'shortage_students': shortage_students[:10],
        'recent_sessions': [s.to_dict() for s in recent_sessions]
    }), 200


@app.route('/api/admin/students', methods=['GET', 'POST'])
@role_required('admin')
def admin_students():
    if request.method == 'GET':
        search = request.args.get('search', '').strip().lower()
        query = StudentProfile.query.join(User)
        if search:
            query = query.filter(
                (User.full_name.ilike(f'%{search}%')) |
                (StudentProfile.roll_number.ilike(f'%{search}%')) |
                (User.email.ilike(f'%{search}%'))
            )
        students = query.all()
        result = []
        for s in students:
            data = s.to_dict()
            data['full_name'] = s.user.full_name
            data['email'] = s.user.email
            # Calculate overall attendance for this student
            rec_total = AttendanceRecord.query.filter_by(student_id=s.id).count()
            rec_present = AttendanceRecord.query.filter_by(student_id=s.id, status='Present').count()
            pct = round((rec_present / rec_total) * 100, 1) if rec_total > 0 else 0.0
            data['attendance_percentage'] = pct
            data['classes_attended'] = rec_present
            data['classes_total'] = rec_total
            result.append(data)
        return jsonify({'students': result}), 200

    # POST: create a student
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', 'Student@123')
    roll_number = data.get('roll_number', '').strip().upper()
    department = data.get('department', '').strip()
    semester = data.get('semester')
    class_id = data.get('class_id')

    if not full_name or not email or not roll_number or not department or not semester:
        return jsonify({'error': 'Missing required student fields.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 409
    if StudentProfile.query.filter_by(roll_number=roll_number).first():
        return jsonify({'error': 'Roll number already exists.'}), 409

    new_user = User(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password),
        role='student'
    )
    db.session.add(new_user)
    db.session.flush()

    new_student = StudentProfile(
        user_id=new_user.id,
        roll_number=roll_number,
        department=department,
        semester=int(semester),
        class_id=int(class_id) if class_id else None
    )
    db.session.add(new_student)
    db.session.flush()

    # Automatically enroll in semester subjects
    matching_subjects = Subject.query.filter_by(department=department, semester=int(semester)).all()
    for sub in matching_subjects:
        db.session.add(Enrollment(student_id=new_student.id, subject_id=sub.id))

    db.session.commit()
    return jsonify({'message': 'Student created successfully.', 'student': new_student.to_dict()}), 201


@app.route('/api/admin/students/<int:student_id>', methods=['PUT', 'DELETE'])
@role_required('admin')
def admin_student_detail(student_id):
    student = StudentProfile.query.get_or_404(student_id)
    if request.method == 'DELETE':
        user = student.user
        db.session.delete(user) # cascade deletes profile and enrollments
        db.session.commit()
        return jsonify({'message': 'Student deleted successfully.'}), 200

    data = request.get_json() or {}
    user = student.user
    if 'full_name' in data:
        user.full_name = data['full_name'].strip()
    if 'department' in data:
        student.department = data['department'].strip()
    if 'semester' in data:
        student.semester = int(data['semester'])
    if 'class_id' in data:
        student.class_id = int(data['class_id']) if data['class_id'] else None
    if 'password' in data and data['password']:
        user.password_hash = generate_password_hash(data['password'])

    db.session.commit()
    return jsonify({'message': 'Student updated successfully.'}), 200


@app.route('/api/admin/faculty', methods=['GET', 'POST'])
@role_required('admin')
def admin_faculty():
    if request.method == 'GET':
        faculties = FacultyProfile.query.join(User).all()
        result = []
        for f in faculties:
            d = f.to_dict()
            d['full_name'] = f.user.full_name
            d['email'] = f.user.email
            d['assignments'] = [a.to_dict() for a in f.assignments]
            result.append(d)
        return jsonify({'faculty': result}), 200

    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', 'Faculty@123')
    department = data.get('department', '').strip()
    employee_id = data.get('employee_id', '').strip()

    if not full_name or not email or not department:
        return jsonify({'error': 'Please provide full_name, email, and department.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 409

    new_user = User(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password),
        role='faculty'
    )
    db.session.add(new_user)
    db.session.flush()

    new_fac = FacultyProfile(
        user_id=new_user.id,
        department=department,
        employee_id=employee_id or f"FAC{new_user.id:03d}"
    )
    db.session.add(new_fac)
    db.session.commit()
    return jsonify({'message': 'Faculty member created successfully.', 'faculty': new_fac.to_dict()}), 201


@app.route('/api/admin/faculty/<int:faculty_id>/assign', methods=['POST'])
@role_required('admin')
def admin_assign_faculty(faculty_id):
    faculty = FacultyProfile.query.get_or_404(faculty_id)
    data = request.get_json() or {}
    subject_id = data.get('subject_id')
    class_id = data.get('class_id')

    if not subject_id or not class_id:
        return jsonify({'error': 'subject_id and class_id are required.'}), 400

    existing = FacultyAssignment.query.filter_by(
        faculty_id=faculty.id, subject_id=int(subject_id), class_id=int(class_id)
    ).first()

    if existing:
        return jsonify({'error': 'Faculty is already assigned to this subject and class.'}), 409

    assignment = FacultyAssignment(
        faculty_id=faculty.id,
        subject_id=int(subject_id),
        class_id=int(class_id)
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment created successfully.', 'assignment': assignment.to_dict()}), 201


@app.route('/api/admin/faculty/assignments/<int:assignment_id>', methods=['DELETE'])
@role_required('admin')
def admin_delete_assignment(assignment_id):
    assignment = FacultyAssignment.query.get_or_404(assignment_id)
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment removed successfully.'}), 200


@app.route('/api/admin/classes', methods=['GET', 'POST'])
@role_required('admin')
def admin_classes():
    if request.method == 'GET':
        classes = Class.query.order_by(Class.department, Class.semester, Class.class_name).all()
        return jsonify({'classes': [c.to_dict() for c in classes]}), 200

    data = request.get_json() or {}
    class_name = data.get('class_name', '').strip()
    department = data.get('department', '').strip()
    semester = data.get('semester')

    if not class_name or not department or not semester:
        return jsonify({'error': 'class_name, department, and semester are required.'}), 400

    if Class.query.filter_by(class_name=class_name).first():
        return jsonify({'error': 'A class with this name already exists.'}), 409

    new_class = Class(
        class_name=class_name,
        department=department,
        semester=int(semester)
    )
    db.session.add(new_class)
    db.session.commit()
    return jsonify({'message': 'Class created successfully.', 'class': new_class.to_dict()}), 201


@app.route('/api/admin/subjects', methods=['GET', 'POST'])
@role_required('admin')
def admin_subjects():
    if request.method == 'GET':
        subjects = Subject.query.order_by(Subject.department, Subject.semester, Subject.subject_code).all()
        return jsonify({'subjects': [s.to_dict() for s in subjects]}), 200

    data = request.get_json() or {}
    subject_code = data.get('subject_code', '').strip().upper()
    subject_name = data.get('subject_name', '').strip()
    department = data.get('department', '').strip()
    semester = data.get('semester')
    min_pct = data.get('minimum_attendance_percentage', 75.0)

    if not subject_code or not subject_name or not department or not semester:
        return jsonify({'error': 'subject_code, subject_name, department, semester are required.'}), 400

    if Subject.query.filter_by(subject_code=subject_code).first():
        return jsonify({'error': 'Subject code already exists.'}), 409

    new_sub = Subject(
        subject_code=subject_code,
        subject_name=subject_name,
        department=department,
        semester=int(semester),
        minimum_attendance_percentage=float(min_pct)
    )
    db.session.add(new_sub)
    db.session.commit()

    # Automatically enroll any existing students in this department and semester
    dept_students = StudentProfile.query.filter_by(department=department, semester=int(semester)).all()
    for st in dept_students:
        if not Enrollment.query.filter_by(student_id=st.id, subject_id=new_sub.id).first():
            db.session.add(Enrollment(student_id=st.id, subject_id=new_sub.id))
    db.session.commit()

    return jsonify({'message': 'Subject created successfully.', 'subject': new_sub.to_dict()}), 201


# ----------------- FACULTY ROUTES -----------------
@app.route('/api/faculty/dashboard', methods=['GET'])
@role_required('faculty')
def faculty_dashboard():
    user_id = int(get_jwt_identity())
    fac_profile = FacultyProfile.query.filter_by(user_id=user_id).first()
    if not fac_profile:
        return jsonify({'error': 'Faculty profile not found.'}), 404

    assignments = fac_profile.assignments
    assigned_subject_ids = list(set([a.subject_id for a in assignments]))
    assigned_class_ids = list(set([a.class_id for a in assignments]))

    # Total classes conducted by this faculty
    classes_conducted = AttendanceSession.query.filter_by(faculty_id=fac_profile.id).count()

    # Total distinct students in assigned classes
    assigned_students_count = StudentProfile.query.filter(StudentProfile.class_id.in_(assigned_class_ids)).count() if assigned_class_ids else 0

    # Identify students with attendance shortages across assigned subjects
    shortage_list = []
    for sub_id in assigned_subject_ids:
        sub = Subject.query.get(sub_id)
        if not sub:
            continue
        # Get all sessions for this subject conducted
        sub_sessions = AttendanceSession.query.filter_by(subject_id=sub_id, faculty_id=fac_profile.id).all()
        session_ids = [s.id for s in sub_sessions]
        if not session_ids:
            continue

        # Get enrolled students
        enrollments = Enrollment.query.filter_by(subject_id=sub_id).all()
        for enr in enrollments:
            st = enr.student
            st_conducted = len(session_ids)
            st_attended = AttendanceRecord.query.filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.student_id == st.id,
                AttendanceRecord.status == 'Present'
            ).count()
            if st_conducted > 0:
                pct = round((st_attended / st_conducted) * 100, 1)
                if pct < sub.minimum_attendance_percentage:
                    shortage_list.append({
                        'student_id': st.id,
                        'name': st.user.full_name,
                        'roll_number': st.roll_number,
                        'subject_code': sub.subject_code,
                        'subject_name': sub.subject_name,
                        'class_name': st.assigned_class.class_name if st.assigned_class else 'N/A',
                        'attended': st_attended,
                        'conducted': st_conducted,
                        'percentage': pct,
                        'required': sub.minimum_attendance_percentage
                    })

    recent_sessions = AttendanceSession.query.filter_by(faculty_id=fac_profile.id).order_by(AttendanceSession.attendance_date.desc(), AttendanceSession.id.desc()).limit(5).all()

    return jsonify({
        'stats': {
            'assigned_subjects_count': len(assigned_subject_ids),
            'classes_conducted': classes_conducted,
            'students_count': assigned_students_count,
            'shortage_count': len(shortage_list)
        },
        'assignments': [a.to_dict() for a in assignments],
        'shortage_students': shortage_list[:10],
        'recent_sessions': [s.to_dict() for s in recent_sessions]
    }), 200


@app.route('/api/faculty/classes', methods=['GET'])
@role_required('faculty')
def faculty_classes():
    user_id = int(get_jwt_identity())
    fac_profile = FacultyProfile.query.filter_by(user_id=user_id).first()
    if not fac_profile:
        return jsonify({'error': 'Faculty profile not found.'}), 404

    assignments = fac_profile.assignments
    return jsonify({'assignments': [a.to_dict() for a in assignments]}), 200


@app.route('/api/faculty/students', methods=['GET'])
@role_required('faculty')
def faculty_students():
    """
    Get students for a specific class_id and subject_id assigned to this faculty.
    """
    user_id = int(get_jwt_identity())
    fac = FacultyProfile.query.filter_by(user_id=user_id).first()
    class_id = request.args.get('class_id')
    subject_id = request.args.get('subject_id')

    if not class_id or not subject_id:
        return jsonify({'error': 'class_id and subject_id query params are required.'}), 400

    # Verify authorization: faculty must be assigned to this class and subject
    assignment = FacultyAssignment.query.filter_by(
        faculty_id=fac.id, class_id=int(class_id), subject_id=int(subject_id)
    ).first()
    if not assignment:
        return jsonify({'error': 'You are not assigned to manage this subject and class.'}), 403

    # Query students in class who are also enrolled in subject
    students = StudentProfile.query.join(Enrollment).filter(
        StudentProfile.class_id == int(class_id),
        Enrollment.subject_id == int(subject_id)
    ).all()

    # Also include students in this class even if not explicitly enrolled, and auto-enroll them
    all_class_students = StudentProfile.query.filter_by(class_id=int(class_id)).all()
    for st in all_class_students:
        if not Enrollment.query.filter_by(student_id=st.id, subject_id=int(subject_id)).first():
            db.session.add(Enrollment(student_id=st.id, subject_id=int(subject_id)))
    db.session.commit()

    all_class_students = StudentProfile.query.filter_by(class_id=int(class_id)).order_by(StudentProfile.roll_number).all()

    result = []
    for st in all_class_students:
        result.append({
            'student_id': st.id,
            'roll_number': st.roll_number,
            'full_name': st.user.full_name,
            'email': st.user.email
        })

    return jsonify({'students': result}), 200


@app.route('/api/faculty/attendance', methods=['GET', 'POST'])
@role_required('faculty')
def faculty_attendance():
    user_id = int(get_jwt_identity())
    fac = FacultyProfile.query.filter_by(user_id=user_id).first()

    if request.method == 'GET':
        # Attendance history
        subject_id = request.args.get('subject_id')
        class_id = request.args.get('class_id')
        date_str = request.args.get('date')

        query = AttendanceSession.query.filter_by(faculty_id=fac.id)
        if subject_id:
            query = query.filter_by(subject_id=int(subject_id))
        if class_id:
            query = query.filter_by(class_id=int(class_id))
        if date_str:
            try:
                d = datetime.strptime(date_str, '%Y-%m-%d').date()
                query = query.filter_by(attendance_date=d)
            except ValueError:
                pass

        sessions = query.order_by(AttendanceSession.attendance_date.desc(), AttendanceSession.id.desc()).all()
        return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200

    # POST: Mark attendance
    data = request.get_json() or {}
    subject_id = data.get('subject_id')
    class_id = data.get('class_id')
    date_str = data.get('attendance_date') # YYYY-MM-DD
    records_data = data.get('records', []) # list of { student_id, status: 'Present'|'Absent' }
    allow_correction = data.get('allow_correction', False)

    if not subject_id or not class_id or not date_str or not records_data:
        return jsonify({'error': 'subject_id, class_id, attendance_date, and records list are required.'}), 400

    # Verify authorization
    assignment = FacultyAssignment.query.filter_by(
        faculty_id=fac.id, class_id=int(class_id), subject_id=int(subject_id)
    ).first()
    if not assignment:
        return jsonify({'error': 'You are not authorized to mark attendance for this class/subject.'}), 403

    try:
        att_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'attendance_date must be in YYYY-MM-DD format.'}), 400

    # Check for existing session
    existing_session = AttendanceSession.query.filter_by(
        subject_id=int(subject_id),
        class_id=int(class_id),
        attendance_date=att_date
    ).first()

    if existing_session:
        if not allow_correction:
            return jsonify({
                'error': f'Attendance for this subject and class has already been recorded on {date_str}.',
                'session_id': existing_session.id,
                'already_exists': True
            }), 409
        else:
            # Authorized update/correction
            session_obj = existing_session
            for r in records_data:
                sid = int(r['student_id'])
                st_status = 'Present' if r.get('status') == 'Present' else 'Absent'
                rec = AttendanceRecord.query.filter_by(attendance_session_id=session_obj.id, student_id=sid).first()
                if rec:
                    rec.status = st_status
                    rec.updated_at = datetime.utcnow()
                else:
                    db.session.add(AttendanceRecord(
                        attendance_session_id=session_obj.id,
                        student_id=sid,
                        status=st_status
                    ))
            db.session.commit()
            return jsonify({
                'message': 'Attendance updated and corrected successfully.',
                'session': session_obj.to_dict()
            }), 200

    # Create new session
    session_obj = AttendanceSession(
        subject_id=int(subject_id),
        class_id=int(class_id),
        faculty_id=fac.id,
        attendance_date=att_date
    )
    db.session.add(session_obj)
    db.session.flush()

    for r in records_data:
        sid = int(r['student_id'])
        st_status = 'Present' if r.get('status') == 'Present' else 'Absent'
        db.session.add(AttendanceRecord(
            attendance_session_id=session_obj.id,
            student_id=sid,
            status=st_status
        ))

    db.session.commit()
    return jsonify({
        'message': f'Attendance successfully saved for {len(records_data)} students on {date_str}.',
        'session': session_obj.to_dict()
    }), 201


@app.route('/api/faculty/attendance/<int:session_id>', methods=['GET'])
@role_required('faculty', 'admin')
def get_session_detail(session_id):
    session = AttendanceSession.query.get_or_404(session_id)
    records = AttendanceRecord.query.filter_by(attendance_session_id=session.id).all()
    data = session.to_dict()
    data['records'] = [r.to_dict() for r in records]
    return jsonify({'session': data}), 200


@app.route('/api/faculty/reports', methods=['GET'])
@role_required('faculty', 'admin')
def faculty_reports():
    """
    Generate subject-wise and class-wise summaries with CSV export capability.
    """
    subject_id = request.args.get('subject_id')
    class_id = request.args.get('class_id')
    export_format = request.args.get('format', 'json')

    if not subject_id or not class_id:
        return jsonify({'error': 'subject_id and class_id query parameters are required.'}), 400

    subject = Subject.query.get_or_404(int(subject_id))
    class_obj = Class.query.get_or_404(int(class_id))

    # All sessions for this subject and class
    sessions = AttendanceSession.query.filter_by(subject_id=subject.id, class_id=class_obj.id).order_by(AttendanceSession.attendance_date).all()
    total_conducted = len(sessions)
    session_ids = [s.id for s in sessions]

    # All students in class
    students = StudentProfile.query.filter_by(class_id=class_obj.id).order_by(StudentProfile.roll_number).all()

    student_reports = []
    class_attendance_sum = 0

    for st in students:
        if total_conducted > 0:
            attended = AttendanceRecord.query.filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.student_id == st.id,
                AttendanceRecord.status == 'Present'
            ).count()
        else:
            attended = 0

        plan = calculate_recovery_plan(attended, total_conducted, subject.minimum_attendance_percentage)
        class_attendance_sum += plan['current_percentage']

        student_reports.append({
            'student_id': st.id,
            'roll_number': st.roll_number,
            'student_name': st.user.full_name,
            'department': st.department,
            'classes_conducted': total_conducted,
            'classes_attended': attended,
            'classes_missed': plan['classes_missed'],
            'attendance_percentage': plan['current_percentage'],
            'status': plan['status'],
            'badge_color': plan['badge_color'],
            'required_future_classes': plan['required_future_classes'],
            'safe_absences': plan['safe_absences'],
            'recommendation': plan['recommendation']
        })

    average_percentage = round(class_attendance_sum / len(students), 1) if students else 0.0

    if export_format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['College Attendance Management System - Attendly'])
        writer.writerow(['Subject Report:', f"{subject.subject_name} ({subject.subject_code})"])
        writer.writerow(['Class:', class_obj.class_name])
        writer.writerow(['Department:', class_obj.department, 'Semester:', class_obj.semester])
        writer.writerow(['Total Classes Conducted:', total_conducted])
        writer.writerow(['Class Average Attendance:', f"{average_percentage}%"])
        writer.writerow(['Required Attendance Threshold:', f"{subject.minimum_attendance_percentage}%"])
        writer.writerow([])
        writer.writerow(['Roll Number', 'Student Name', 'Classes Conducted', 'Classes Attended', 'Missed', 'Percentage (%)', 'Status', 'Consecutive Classes to Recover', 'Safe Absences'])

        for sr in student_reports:
            writer.writerow([
                sr['roll_number'],
                sr['student_name'],
                sr['classes_conducted'],
                sr['classes_attended'],
                sr['classes_missed'],
                sr['attendance_percentage'],
                sr['status'].replace('_', ' ').capitalize(),
                sr['required_future_classes'],
                sr['safe_absences']
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Disposition'] = f"attachment; filename=Attendance_Report_{subject.subject_code}_{class_obj.class_name}.csv"
        response.headers['Content-Type'] = 'text/csv'
        return response

    return jsonify({
        'subject': subject.to_dict(),
        'class': class_obj.to_dict(),
        'total_conducted': total_conducted,
        'average_percentage': average_percentage,
        'student_count': len(students),
        'student_reports': student_reports
    }), 200


# ----------------- STUDENT ROUTES -----------------
@app.route('/api/student/dashboard', methods=['GET'])
@role_required('student')
def student_dashboard():
    user_id = int(get_jwt_identity())
    student = StudentProfile.query.filter_by(user_id=user_id).first()
    if not student:
        return jsonify({'error': 'Student profile not found.'}), 404

    # Enrolled subjects
    enrollments = Enrollment.query.filter_by(student_id=student.id).all()
    subject_plans = []
    total_conducted_all = 0
    total_attended_all = 0

    for enr in enrollments:
        sub = enr.subject
        # Find all sessions for this subject for student's class (or where student has records)
        sessions = AttendanceSession.query.filter_by(subject_id=sub.id)
        if student.class_id:
            sessions = sessions.filter_by(class_id=student.class_id)
        session_list = sessions.all()
        session_ids = [s.id for s in session_list]

        conducted = len(session_ids)
        if conducted > 0:
            attended = AttendanceRecord.query.filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == 'Present'
            ).count()
        else:
            attended = 0

        total_conducted_all += conducted
        total_attended_all += attended

        plan = calculate_recovery_plan(attended, conducted, sub.minimum_attendance_percentage)
        plan['subject_id'] = sub.id
        plan['subject_code'] = sub.subject_code
        plan['subject_name'] = sub.subject_name
        subject_plans.append(plan)

    overall_pct = round((total_attended_all / total_conducted_all) * 100, 1) if total_conducted_all > 0 else 0.0
    overall_plan = calculate_recovery_plan(total_attended_all, total_conducted_all, 75.0)

    # Recent attendance records
    recent_records = AttendanceRecord.query.filter_by(student_id=student.id).join(AttendanceSession).order_by(AttendanceSession.attendance_date.desc()).limit(8).all()
    recent_list = []
    for r in recent_records:
        recent_list.append({
            'date': r.session.attendance_date.strftime('%Y-%m-%d'),
            'subject_code': r.session.subject.subject_code,
            'subject_name': r.session.subject.subject_name,
            'status': r.status
        })

    return jsonify({
        'student': {
            'id': student.id,
            'full_name': student.user.full_name,
            'roll_number': student.roll_number,
            'email': student.user.email,
            'department': student.department,
            'semester': student.semester,
            'class_name': student.assigned_class.class_name if student.assigned_class else 'N/A'
        },
        'overall': {
            'conducted': total_conducted_all,
            'attended': total_attended_all,
            'missed': total_conducted_all - total_attended_all,
            'percentage': overall_pct,
            'status': overall_plan['status'],
            'badge_color': overall_plan['badge_color'],
            'safe_absences': overall_plan['safe_absences'],
            'required_future_classes': overall_plan['required_future_classes'],
            'recommendation': overall_plan['recommendation']
        },
        'subjects': subject_plans,
        'recent_records': recent_list
    }), 200


@app.route('/api/student/attendance/history', methods=['GET'])
@role_required('student')
def student_attendance_history():
    user_id = int(get_jwt_identity())
    student = StudentProfile.query.filter_by(user_id=user_id).first()
    subject_id = request.args.get('subject_id')
    date_str = request.args.get('date')

    query = AttendanceRecord.query.filter_by(student_id=student.id).join(AttendanceSession)

    if subject_id:
        query = query.filter(AttendanceSession.subject_id == int(subject_id))
    if date_str:
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(AttendanceSession.attendance_date == d)
        except ValueError:
            pass

    records = query.order_by(AttendanceSession.attendance_date.desc(), AttendanceSession.id.desc()).all()
    result = []
    for r in records:
        result.append({
            'id': r.id,
            'date': r.session.attendance_date.strftime('%Y-%m-%d'),
            'subject_code': r.session.subject.subject_code,
            'subject_name': r.session.subject.subject_name,
            'faculty_name': r.session.faculty.user.full_name if r.session.faculty and r.session.faculty.user else 'Faculty',
            'status': r.status
        })

    return jsonify({'records': result}), 200


@app.route('/api/student/recovery-plan', methods=['GET'])
@role_required('student')
def student_recovery_plan():
    """
    Dedicated endpoint for the Smart Attendance Recovery Planner feature.
    """
    user_id = int(get_jwt_identity())
    student = StudentProfile.query.filter_by(user_id=user_id).first()
    target_param = request.args.get('target_percentage')

    enrollments = Enrollment.query.filter_by(student_id=student.id).all()
    plans = []

    for enr in enrollments:
        sub = enr.subject
        target = float(target_param) if target_param else sub.minimum_attendance_percentage

        sessions = AttendanceSession.query.filter_by(subject_id=sub.id)
        if student.class_id:
            sessions = sessions.filter_by(class_id=student.class_id)
        session_list = sessions.all()
        session_ids = [s.id for s in session_list]

        conducted = len(session_ids)
        attended = 0
        if conducted > 0:
            attended = AttendanceRecord.query.filter(
                AttendanceRecord.attendance_session_id.in_(session_ids),
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == 'Present'
            ).count()

        plan = calculate_recovery_plan(attended, conducted, target)
        plan['subject_id'] = sub.id
        plan['subject_code'] = sub.subject_code
        plan['subject_name'] = sub.subject_name
        plans.append(plan)

    return jsonify({
        'student_name': student.user.full_name,
        'roll_number': student.roll_number,
        'plans': plans
    }), 200


@app.route('/api/student/export-csv', methods=['GET'])
@role_required('student')
def student_export_csv():
    user_id = int(get_jwt_identity())
    student = StudentProfile.query.filter_by(user_id=user_id).first()

    enrollments = Enrollment.query.filter_by(student_id=student.id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Attendly - Student Attendance Summary Report'])
    writer.writerow(['Student Name:', student.user.full_name])
    writer.writerow(['Roll Number:', student.roll_number])
    writer.writerow(['Department:', student.department, 'Semester:', student.semester])
    writer.writerow(['Generated Date:', datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')])
    writer.writerow([])
    writer.writerow(['Subject Code', 'Subject Name', 'Conducted', 'Attended', 'Missed', 'Percentage (%)', 'Threshold (%)', 'Status', 'Future Classes Needed to Recover', 'Safe Absences'])

    for enr in enrollments:
        sub = enr.subject
        sessions = AttendanceSession.query.filter_by(subject_id=sub.id)
        if student.class_id:
            sessions = sessions.filter_by(class_id=student.class_id)
        session_ids = [s.id for s in sessions.all()]
        conducted = len(session_ids)
        attended = AttendanceRecord.query.filter(
            AttendanceRecord.attendance_session_id.in_(session_ids),
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.status == 'Present'
        ).count() if conducted > 0 else 0

        plan = calculate_recovery_plan(attended, conducted, sub.minimum_attendance_percentage)
        writer.writerow([
            sub.subject_code,
            sub.subject_name,
            conducted,
            attended,
            plan['classes_missed'],
            plan['current_percentage'],
            sub.minimum_attendance_percentage,
            plan['status'].replace('_', ' ').capitalize(),
            plan['required_future_classes'],
            plan['safe_absences']
        ])

    response = make_response(output.getvalue())
    response.headers['Content-Disposition'] = f"attachment; filename=Attendance_Summary_{student.roll_number}.csv"
    response.headers['Content-Type'] = 'text/csv'
    return response


# ----------------- SEED DATABASE CLI / INITIALIZER -----------------
def seed_demo_data():
    """Seeds default demo accounts and initial classes/subjects if database is fresh"""
    if User.query.first() is not None:
        return

    print("Initializing demo accounts and course data...")

    # 1. Admin
    admin_user = User(
        full_name="Dr. Arthur Vance (Dean/Admin)",
        email="admin@college.edu",
        password_hash=generate_password_hash("Admin@123"),
        role="admin"
    )
    db.session.add(admin_user)

    # 2. Classes
    cse_class = Class(class_name="CSE-3A", department="Computer Science & Engineering", semester=5)
    ece_class = Class(class_name="ECE-3B", department="Electronics & Comm. Engineering", semester=5)
    db.session.add_all([cse_class, ece_class])
    db.session.flush()

    # 3. Faculty
    fac_user = User(
        full_name="Prof. Sarah Jenkins",
        email="faculty@college.edu",
        password_hash=generate_password_hash("Faculty@123"),
        role="faculty"
    )
    db.session.add(fac_user)
    db.session.flush()

    fac_profile = FacultyProfile(
        user_id=fac_user.id,
        department="Computer Science & Engineering",
        employee_id="FAC001"
    )
    db.session.add(fac_profile)
    db.session.flush()

    # 4. Subjects
    sub1 = Subject(subject_code="CS501", subject_name="Database Management Systems", department="Computer Science & Engineering", semester=5, minimum_attendance_percentage=75.0)
    sub2 = Subject(subject_code="CS502", subject_name="Computer Networks", department="Computer Science & Engineering", semester=5, minimum_attendance_percentage=75.0)
    sub3 = Subject(subject_code="CS503", subject_name="Operating Systems", department="Computer Science & Engineering", semester=5, minimum_attendance_percentage=75.0)
    db.session.add_all([sub1, sub2, sub3])
    db.session.flush()

    # Assign faculty to subjects
    a1 = FacultyAssignment(faculty_id=fac_profile.id, subject_id=sub1.id, class_id=cse_class.id)
    a2 = FacultyAssignment(faculty_id=fac_profile.id, subject_id=sub2.id, class_id=cse_class.id)
    db.session.add_all([a1, a2])

    # 5. Students
    # Student 1: John Doe (Demo student for recovery calculator - 36 out of 50 classes in CS501 to test 72% -> 6 recovery!)
    s1_user = User(full_name="Alex Rivera", email="student@college.edu", password_hash=generate_password_hash("Student@123"), role="student")
    # Student 2: High attendance
    s2_user = User(full_name="Maya Lin", email="maya@college.edu", password_hash=generate_password_hash("Student@123"), role="student")
    # Student 3: Low attendance
    s3_user = User(full_name="Rahul Sharma", email="rahul@college.edu", password_hash=generate_password_hash("Student@123"), role="student")

    db.session.add_all([s1_user, s2_user, s3_user])
    db.session.flush()

    s1_prof = StudentProfile(user_id=s1_user.id, roll_number="21CS101", department="Computer Science & Engineering", semester=5, class_id=cse_class.id)
    s2_prof = StudentProfile(user_id=s2_user.id, roll_number="21CS102", department="Computer Science & Engineering", semester=5, class_id=cse_class.id)
    s3_prof = StudentProfile(user_id=s3_user.id, roll_number="21CS103", department="Computer Science & Engineering", semester=5, class_id=cse_class.id)

    db.session.add_all([s1_prof, s2_prof, s3_prof])
    db.session.flush()

    # Enroll in CS501 and CS502
    for p in [s1_prof, s2_prof, s3_prof]:
        db.session.add(Enrollment(student_id=p.id, subject_id=sub1.id))
        db.session.add(Enrollment(student_id=p.id, subject_id=sub2.id))
        db.session.add(Enrollment(student_id=p.id, subject_id=sub3.id))

    db.session.flush()

    # Generate historical attendance sessions for CS501
    # 50 distinct class days for CS501
    from datetime import timedelta
    current_dt = date(2026, 8, 1)
    sessions_added = 0

    while sessions_added < 50:
        # Avoid Sundays
        if current_dt.weekday() != 6:
            sess = AttendanceSession(
                subject_id=sub1.id,
                class_id=cse_class.id,
                faculty_id=fac_profile.id,
                attendance_date=current_dt
            )
            db.session.add(sess)
            db.session.flush()

            # s1 attends 36 out of 50 (first 36 present, rest 14 absent -> 36/50 = 72%)
            s1_status = 'Present' if sessions_added < 36 else 'Absent'
            # s2 attends 46 out of 50 -> 92%
            s2_status = 'Present' if sessions_added < 46 else 'Absent'
            # s3 attends 25 out of 50 -> 50%
            s3_status = 'Present' if sessions_added < 25 else 'Absent'

            db.session.add(AttendanceRecord(attendance_session_id=sess.id, student_id=s1_prof.id, status=s1_status))
            db.session.add(AttendanceRecord(attendance_session_id=sess.id, student_id=s2_prof.id, status=s2_status))
            db.session.add(AttendanceRecord(attendance_session_id=sess.id, student_id=s3_prof.id, status=s3_status))
            sessions_added += 1

        current_dt += timedelta(days=1)

    # Add 10 distinct sessions for CS502 (Operating Systems / Networks) starting in October
    cs502_dt = date(2026, 10, 1)
    cs502_added = 0
    while cs502_added < 10:
        if cs502_dt.weekday() != 6:
            sess2 = AttendanceSession(
                subject_id=sub2.id,
                class_id=cse_class.id,
                faculty_id=fac_profile.id,
                attendance_date=cs502_dt
            )
            db.session.add(sess2)
            db.session.flush()

            db.session.add(AttendanceRecord(attendance_session_id=sess2.id, student_id=s1_prof.id, status='Present' if cs502_added < 8 else 'Absent'))
            db.session.add(AttendanceRecord(attendance_session_id=sess2.id, student_id=s2_prof.id, status='Present'))
            db.session.add(AttendanceRecord(attendance_session_id=sess2.id, student_id=s3_prof.id, status='Present' if cs502_added < 4 else 'Absent'))
            cs502_added += 1

        cs502_dt += timedelta(days=1)

    db.session.commit()
    print("Database successfully seeded with demo accounts and attendance test records!")


with app.app_context():
    db.create_all()
    seed_demo_data()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
