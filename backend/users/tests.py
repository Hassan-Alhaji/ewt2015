from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.utils import timezone
from .models import OTPLogin, UserProfile

User = get_user_model()

class UserAuthOTPPests(APITestCase):

    def setUp(self):
        self.send_otp_url = reverse('send_otp')
        self.verify_otp_url = reverse('verify_otp')
        self.profile_url = reverse('profile')
        self.admin_members_url = reverse('admin_members')
        self.test_mobile = '0512345678'
        self.test_mobile_admin = '0500000000'

    def test_send_otp_simulation(self):
        # Post request to send OTP
        response = self.client.post(self.send_otp_url, {'mobile': self.test_mobile})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # In simulation mode, otp_code must be in the response
        self.assertIn('otp_code', response.data)
        
        # Check that OTPLogin record was created
        otp_count = OTPLogin.objects.filter(mobile=self.test_mobile).count()
        self.assertEqual(otp_count, 1)

    def test_verify_otp_and_login(self):
        # Send OTP
        response = self.client.post(self.send_otp_url, {'mobile': self.test_mobile})
        code = response.data['otp_code']
        
        # Verify OTP
        verify_response = self.client.post(self.verify_otp_url, {
            'mobile': self.test_mobile,
            'code': code
        })
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertIn('token', verify_response.data)
        self.assertTrue(verify_response.data['is_new_user'])
        
        # Verify user was created
        user_exists = User.objects.filter(mobile=self.test_mobile).exists()
        self.assertTrue(user_exists)

    def test_profile_creation_and_privacy(self):
        # Create user & token
        user = User.objects.create_user(mobile=self.test_mobile)
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        
        # Profile initially returns 404
        profile_response = self.client.get(self.profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Setup profile (including secret fields)
        profile_data = {
            'name': 'خالد محمد',
            'gender': 'male',
            'birth_date': '1990-01-01',
            'city': 'الدمام',
            'weight': 80.5,
            'health_notes': 'يعاني من إصابة سابقة في الركبة',
            'is_disabled': False,
            'preferred_activity': 'walk'
        }
        
        create_response = self.client.post(self.profile_url, profile_data)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['name'], 'خالد محمد')
        self.assertEqual(create_response.data['weight'], 80.5)
        
        # Check representation for the owner - should show secret health notes
        get_response = self.client.get(self.profile_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data['weight'], 80.5)
        self.assertEqual(get_response.data['health_notes'], 'يعاني من إصابة سابقة في الركبة')
        
        # Now test privacy - represent profile for another normal user
        other_user = User.objects.create_user(mobile='0599999999')
        other_token = Token.objects.create(user=other_user)
        
        # Use administrative URL or direct serialization check since normal users can't view others' profile via profile_url
        # Let's perform a direct check on the serializer
        from .serializers import UserProfileSerializer
        profile_obj = UserProfile.objects.get(user=user)
        
        # Request context with normal user (other_user)
        class MockRequest:
            def __init__(self, user):
                self.user = user
                
        serializer = UserProfileSerializer(profile_obj, context={'request': MockRequest(other_user)})
        serialized_data = serializer.data
        
        # Health notes and weight should be hidden (popped)
        self.assertNotIn('weight', serialized_data)
        self.assertNotIn('health_notes', serialized_data)

    def test_admin_member_views(self):
        # Create admin user
        admin_user = User.objects.create_superuser(mobile=self.test_mobile_admin, password='password')
        admin_token = Token.objects.create(user=admin_user)
        
        # Create regular user with a profile
        regular_user = User.objects.create_user(mobile=self.test_mobile)
        UserProfile.objects.create(
            user=regular_user,
            name='خالد محمد',
            gender='male',
            birth_date='1990-01-01',
            city='الدمام',
            weight=80.5,
            health_notes='إصابة خفيفة',
            is_disabled=False,
            preferred_activity='walk'
        )
        
        # Authenticate as regular user - admin members endpoint should be forbidden
        regular_token = Token.objects.create(user=regular_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + regular_token.key)
        admin_response = self.client.get(self.admin_members_url)
        self.assertEqual(admin_response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Authenticate as Admin
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)
        admin_response = self.client.get(self.admin_members_url)
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        # Should return regular user list (with weight and health_notes because requester is admin)
        self.assertEqual(len(admin_response.data), 2) # Admin and regular user
        
        # Activate regular user
        activate_response = self.client.patch(self.admin_members_url, {
            'mobile': self.test_mobile,
            'is_approved': True
        })
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.get(mobile=self.test_mobile).is_approved)


class ProgressionAndCategoriesTests(APITestCase):

    def setUp(self):
        from .models import Category
        # Ensure default categories exist
        self.special_needs, _ = Category.objects.get_or_create(code='special_needs', defaults={"name": "أصحاب الهمم", "description": ""})
        self.seniors, _ = Category.objects.get_or_create(code='seniors', defaults={"name": "كبار السن", "description": ""})
        self.ladies, _ = Category.objects.get_or_create(code='ladies', defaults={"name": "السيدات", "description": ""})
        self.youth, _ = Category.objects.get_or_create(code='youth', defaults={"name": "الشباب", "description": ""})
        
        self.profile_url = reverse('profile')
        self.admin_members_url = reverse('admin_members')
        self.categories_url = reverse('categories')
        
        self.test_mobile = '0522222222'
        self.test_mobile_admin = '0500000000'

    def test_auto_classification(self):
        # 1. Test "Special Needs" auto classification
        user1 = User.objects.create_user(mobile='0590000001')
        profile1 = UserProfile.objects.create(
            user=user1, name='أحمد المعاق', gender='male',
            birth_date='1990-01-01', city='الرياض', is_disabled=True
        )
        self.assertEqual(profile1.category.code, 'special_needs')

        # 2. Test "Seniors" auto classification (age >= 60)
        user2 = User.objects.create_user(mobile='0590000002')
        profile2 = UserProfile.objects.create(
            user=user2, name='العم صالح', gender='male',
            birth_date='1950-01-01', city='الدمام', is_disabled=False
        )
        self.assertEqual(profile2.category.code, 'seniors')

        # 3. Test "Ladies" auto classification (female, not disabled, < 60)
        user3 = User.objects.create_user(mobile='0590000003')
        profile3 = UserProfile.objects.create(
            user=user3, name='سارة أحمد', gender='female',
            birth_date='1995-05-05', city='الخبر', is_disabled=False
        )
        self.assertEqual(profile3.category.code, 'ladies')

        # 4. Test "Youth" auto classification (male, not disabled, < 60)
        user4 = User.objects.create_user(mobile='0590000004')
        profile4 = UserProfile.objects.create(
            user=user4, name='محمد خالد', gender='male',
            birth_date='2000-01-01', city='الخبر', is_disabled=False
        )
        self.assertEqual(profile4.category.code, 'youth')

    def test_level_calculation(self):
        from .progression import get_level_info
        
        # 0 km -> Level 1 (Beginner)
        lvl_0 = get_level_info(0)
        self.assertEqual(lvl_0["level_number"], 1)
        self.assertEqual(lvl_0["level_name_ar"], "مبتدئ")
        self.assertEqual(lvl_0["progress_percent"], 0)
        
        # 75 km -> Level 2 (Explorer, min 50, next 100) -> 50% progress
        lvl_75 = get_level_info(75)
        self.assertEqual(lvl_75["level_number"], 2)
        self.assertEqual(lvl_75["level_name_ar"], "مكتشف")
        self.assertEqual(lvl_75["progress_percent"], 50)
        
        # 5000+ km -> Level 15 (Ambassador)
        lvl_max = get_level_info(5200)
        self.assertEqual(lvl_max["level_number"], 15)
        self.assertEqual(lvl_max["progress_percent"], 100)

    def test_admin_category_override(self):
        admin_user = User.objects.create_superuser(mobile=self.test_mobile_admin, password='password')
        admin_token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)

        user = User.objects.create_user(mobile=self.test_mobile)
        profile = UserProfile.objects.create(
            user=user, name='خالد الشباب', gender='male',
            birth_date='1990-01-01', city='الدمام', is_disabled=False
        )
        self.assertEqual(profile.category.code, 'youth')
        self.assertFalse(profile.is_category_manual)

        response = self.client.patch(self.admin_members_url, {
            'mobile': self.test_mobile,
            'category_id': self.seniors.id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        profile.refresh_from_db()
        self.assertEqual(profile.category.code, 'seniors')
        self.assertTrue(profile.is_category_manual)

    def test_manual_points_adding(self):
        admin_user = User.objects.create_superuser(mobile=self.test_mobile_admin, password='password')
        admin_token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)

        user = User.objects.create_user(mobile=self.test_mobile)
        UserProfile.objects.create(
            user=user, name='خالد النقاط', gender='male',
            birth_date='1990-01-01', city='الدمام', is_disabled=False
        )

        admin_add_points_url = reverse('admin_add_points')
        response = self.client.post(admin_add_points_url, {
            'mobile': self.test_mobile,
            'amount': 150,
            'description': 'حضور فعالية ممشى الكورنيش'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['points'], 150)

        from .models import PointsTransaction
        txn = PointsTransaction.objects.filter(user=user).first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, 150)
        self.assertEqual(txn.transaction_type, 'admin_adjustment')
        self.assertEqual(txn.description, 'حضور فعالية ممشى الكورنيش')

    def test_admin_add_walk(self):
        admin_user = User.objects.create_superuser(mobile=self.test_mobile_admin, password='password')
        admin_token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)

        user = User.objects.create_user(mobile=self.test_mobile)
        profile = UserProfile.objects.create(
            user=user, name='خالد المشي', gender='male',
            birth_date='1990-01-01', city='الدمام', is_disabled=False
        )
        self.assertEqual(profile.total_km, 0)
        self.assertEqual(profile.points, 0)

        admin_add_walk_url = reverse('admin_add_walk')
        
        # Add 5.5 km and 11 points (2 points per km multiplier logic)
        response = self.client.post(admin_add_walk_url, {
            'mobile': self.test_mobile,
            'km': 5.5,
            'points': 11,
            'description': 'مشي يومي'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_km'], 5.5)
        self.assertEqual(response.data['points'], 11)

        # Verify profile has updated fields
        profile.refresh_from_db()
        self.assertEqual(profile.total_km, 5.5)
        self.assertEqual(profile.points, 11)

        # Verify PointsTransaction was created
        from .models import PointsTransaction
        txn = PointsTransaction.objects.filter(user=user, transaction_type='walk_activity').first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, 11)
        self.assertEqual(txn.transaction_type, 'walk_activity')
        self.assertEqual(txn.description, 'مشي يومي')

    def test_events_list_and_register_attendance(self):
        # Create user
        user = User.objects.create_user(mobile=self.test_mobile)
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

        from .models import Event
        event = Event.objects.create(
            name_ar="فعالية الخبر",
            name_en="Khobar Event",
            points=40,
            km=3.0,
            is_active=True
        )

        # Get events list
        response = self.client.get(reverse('events_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4) # 3 populated by migration + 1 new
        
        # Verify attendance status is None
        khobar_ev = next(e for e in response.data if e['id'] == event.id)
        self.assertIsNone(khobar_ev['attendance_status'])

        # Register attendance
        register_url = reverse('events_register_attendance')
        register_response = self.client.post(register_url, {'event_id': event.id})
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(register_response.data['status'], 'pending')

        # Get list again, should be pending
        response = self.client.get(reverse('events_list'))
        khobar_ev = next(e for e in response.data if e['id'] == event.id)
        self.assertEqual(khobar_ev['attendance_status'], 'pending')

    def test_admin_attendance_approval(self):
        # Create normal user with profile
        user = User.objects.create_user(mobile=self.test_mobile)
        profile = UserProfile.objects.create(
            user=user, name='خالد العميل', gender='male',
            birth_date='1990-01-01', city='الدمام', is_disabled=False
        )

        from .models import Event, EventAttendance
        event = Event.objects.create(
            name_ar="تحدي الطاقة",
            name_en="Energy Challenge",
            points=60,
            km=6.0,
            is_active=True
        )

        # Create pending attendance
        attendance = EventAttendance.objects.create(user=user, event=event, status='pending')

        # Create admin user
        admin_user = User.objects.create_superuser(mobile=self.test_mobile_admin, password='password')
        admin_token = Token.objects.create(user=admin_user)
        
        # Authenticate as admin
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + admin_token.key)

        # Approve attendance
        approval_url = reverse('admin_attendances')
        response = self.client.patch(approval_url, {
            'attendance_id': attendance.id,
            'status': 'approved'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check user profile points & km updated
        profile.refresh_from_db()
        self.assertEqual(profile.total_km, 6.0)
        self.assertEqual(profile.points, 60)

        # Check transaction created
        from .models import PointsTransaction
        txn = PointsTransaction.objects.filter(user=user, transaction_type='event_attendance').first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, 60)
        self.assertEqual(txn.description, "حضور فعالية: تحدي الطاقة")

    def test_expired_event_attendance_rejection(self):
        # Create user
        user = User.objects.create_user(mobile=self.test_mobile)
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

        from .models import Event
        # Create an expired event (yesterday)
        from datetime import date, time
        yesterday = date.today() - timezone.timedelta(days=1)
        event = Event.objects.create(
            name_ar="فعالية الأمس",
            name_en="Yesterday's Event",
            points=20,
            km=2.0,
            event_date=yesterday,
            event_time=time(18, 0),
            is_active=True
        )

        # Try to register attendance
        register_url = reverse('events_register_attendance')
        response = self.client.post(register_url, {'event_id': event.id})
        
        # Should be rejected with 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("انتهى وقت التسجيل", response.data['detail'])




