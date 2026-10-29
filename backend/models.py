from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'faculty', 'student'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    student_profile = db.relationship('StudentProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    faculty_profile = db.relationship('FacultyProfile', backref='user', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        data = {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if self.role == 'student' and self.student_profile:
            data['student_profile'] = self.student_profile.to_dict()
        elif self.role == 'faculty' and self.faculty_profile:
            data['faculty_profile'] = self.faculty_profile.to_dict()
        return data


class Class(db.Model):
    __tablename__ = 'classes'

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False, unique=True)  # e.g. "CSE-3A"
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)

    # Relationships
    students = db.relationship('StudentProfile', backref='assigned_class', lazy=True)
    sessions = db.relationship('AttendanceSession', backref='class_obj', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'class_name': self.class_name,
            'department': self.department,
            'semester': self.semester,
            'student_count': len(self.students)
        }


class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    roll_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='SET NULL'), nullable=True)

    enrollments = db.relationship('Enrollment', backref='student', lazy=True, cascade='all, delete-orphan')
    attendance_records = db.relationship('AttendanceRecord', backref='student', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'roll_number': self.roll_number,
            'department': self.department,
            'semester': self.semester,
            'class_id': self.class_id,
            'class_name': self.assigned_class.class_name if self.assigned_class else None
        }


class FacultyProfile(db.Model):
    __tablename__ = 'faculty_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    department = db.Column(db.String(100), nullable=False)
    employee_id = db.Column(db.String(50), unique=True, nullable=True)

    assignments = db.relationship('FacultyAssignment', backref='faculty', lazy=True, cascade='all, delete-orphan')
    sessions = db.relationship('AttendanceSession', backref='faculty', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'department': self.department,
            'employee_id': self.employee_id
        }


class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.Integer, primary_key=True)
    subject_code = db.Column(db.String(20), unique=True, nullable=False)
    subject_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    minimum_attendance_percentage = db.Column(db.Float, default=75.0, nullable=False)

    enrollments = db.relationship('Enrollment', backref='subject', lazy=True, cascade='all, delete-orphan')
    faculty_assignments = db.relationship('FacultyAssignment', backref='subject', lazy=True, cascade='all, delete-orphan')
    sessions = db.relationship('AttendanceSession', backref='subject', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'subject_code': self.subject_code,
            'subject_name': self.subject_name,
            'department': self.department,
            'semester': self.semester,
            'minimum_attendance_percentage': self.minimum_attendance_percentage
        }


class Enrollment(db.Model):
    __tablename__ = 'enrollments'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_id', name='uq_student_subject'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id
        }


class FacultyAssignment(db.Model):
    __tablename__ = 'faculty_assignments'

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty_profiles.id', ondelete='CASCADE'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)

    subject_rel = db.relationship('Subject', foreign_keys=[subject_id], overlaps="faculty_assignments,assigned_faculties")
    class_rel = db.relationship('Class', foreign_keys=[class_id])

    __table_args__ = (
        db.UniqueConstraint('faculty_id', 'subject_id', 'class_id', name='uq_faculty_subject_class'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'faculty_id': self.faculty_id,
            'subject_id': self.subject_id,
            'class_id': self.class_id,
            'subject_name': self.subject_rel.subject_name if self.subject_rel else None,
            'subject_code': self.subject_rel.subject_code if self.subject_rel else None,
            'class_name': self.class_rel.class_name if self.class_rel else None,
        }


class AttendanceSession(db.Model):
    __tablename__ = 'attendance_sessions'

    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty_profiles.id', ondelete='CASCADE'), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint for subject, class, date (prevents duplicate sessions on same date)
    __table_args__ = (
        db.UniqueConstraint('subject_id', 'class_id', 'attendance_date', name='uq_session_subject_class_date'),
    )

    records = db.relationship('AttendanceRecord', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        present_count = sum(1 for r in self.records if r.status == 'Present')
        absent_count = sum(1 for r in self.records if r.status == 'Absent')
        total = len(self.records)
        percentage = round((present_count / total * 100), 1) if total > 0 else 0
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.subject_name if self.subject else None,
            'subject_code': self.subject.subject_code if self.subject else None,
            'class_id': self.class_id,
            'class_name': self.class_obj.class_name if self.class_obj else None,
            'faculty_id': self.faculty_id,
            'faculty_name': self.faculty.user.full_name if self.faculty and self.faculty.user else None,
            'attendance_date': self.attendance_date.strftime('%Y-%m-%d'),
            'total_students': total,
            'present_count': present_count,
            'absent_count': absent_count,
            'attendance_percentage': percentage,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'

    id = db.Column(db.Integer, primary_key=True)
    attendance_session_id = db.Column(db.Integer, db.ForeignKey('attendance_sessions.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(10), nullable=False)  # 'Present' or 'Absent'
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('attendance_session_id', 'student_id', name='uq_session_student'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'attendance_session_id': self.attendance_session_id,
            'student_id': self.student_id,
            'student_name': self.student.user.full_name if self.student and self.student.user else None,
            'roll_number': self.student.roll_number if self.student else None,
            'status': self.status,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
