import os
from decimal import Decimal
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import UserProfile, OTPLogin, Category, PointsTransaction, Event, EventAttendance, EventLocation, MemberActivityRequest, PointsSettings
from .serializers import OTPSendSerializer, OTPVerifySerializer, UserProfileSerializer, MemberActivityRequestSerializer, LeaderboardSerializer
from django.db.models import Sum

User = get_user_model()

class SendOTPView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = OTPSendSerializer(data=request.data)
        if serializer.is_valid():
            otp_instance, code = serializer.save()
            
            response_data = {
                "message": "تم إرسال رمز التحقق بنجاح.",
                "expires_in": settings.OTP_EXPIRY_MINUTES * 60
            }
            # In simulation mode, return the code in the response to make it easy to test
            if getattr(settings, 'OTP_SIMULATION_MODE', False) and code:
                response_data["otp_code"] = code
                
            return Response(response_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            mobile = serializer.validated_data['mobile']
            otp = serializer.validated_data['otp_instance']
            
            # Mark OTP as used
            otp.is_used = True
            otp.save()
            
            # Get or create user
            user, created = User.objects.get_or_create(mobile=mobile)
            
            # Check if profile exists
            has_profile = UserProfile.objects.filter(user=user).exists()
            
            # Get or create auth token
            token, _ = Token.objects.get_or_create(user=user)
            
            # If the user is staff or superuser, we set is_approved to True automatically
            if user.is_staff and not user.is_approved:
                user.is_approved = True
                user.save()

            return Response({
                "token": token.key,
                "is_new_user": not has_profile,
                "is_approved": user.is_approved,
                "mobile": user.mobile,
                "is_admin": user.is_staff,
                "is_reviewer": getattr(user, 'is_reviewer', False),
                "is_content_manager": getattr(user, 'is_content_manager', False)
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            profile = request.user.profile
            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({"detail": "لم يتم إعداد الملف الشخصي بعد."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, *args, **kwargs):
        # Create or update profile
        created_new = False
        try:
            profile = request.user.profile
            serializer = UserProfileSerializer(profile, data=request.data, partial=True, context={'request': request})
        except UserProfile.DoesNotExist:
            serializer = UserProfileSerializer(data=request.data, context={'request': request})
            created_new = True
            
        if serializer.is_valid():
            serializer.save(user=request.user)
            # M4: remove the activation obstacle — a member who completes their profile
            # is auto-approved (consistent with imported members) so they appear on the
            # leaderboard and can participate immediately. Admin can still deactivate.
            if created_new and not request.user.is_approved:
                request.user.is_approved = True
                request.user.save(update_fields=['is_approved'])
            return Response(serializer.data, status=status.HTTP_201_CREATED if created_new else status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


class AdminMemberView(views.APIView):
    permission_classes = [permissions.IsAdminUser] # Django's IsAdminUser maps to is_staff = True

    def get(self, request, *args, **kwargs):
        # List all users and their profiles
        profiles = UserProfile.objects.all().select_related('user').order_by('-created_at')
        serializer = UserProfileSerializer(profiles, many=True, context={'request': request})
        
        # We also need to list users who registered but haven't created a profile yet
        users_without_profile = User.objects.exclude(profile__isnull=False)
        unprofiled_data = []
        for u in users_without_profile:
            unprofiled_data.append({
                "id": None,
                "mobile": u.mobile,
                "name": "عضو جديد (لم يستكمل البيانات)",
                "avatar": None,
                "gender": None,
                "birth_date": None,
                "city": None,
                "email": None,
                "is_approved": u.is_approved,
                "is_reviewer": getattr(u, 'is_reviewer', False),
                "is_content_manager": getattr(u, 'is_content_manager', False),
                "created_at": u.date_joined
            })
            
        # Combine the lists
        combined_data = list(serializer.data) + unprofiled_data
        return Response(combined_data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        # Activate/deactivate user (approval) or modify status or category
        mobile = request.data.get('mobile')
        is_approved = request.data.get('is_approved')
        is_reviewer = request.data.get('is_reviewer')
        is_content_manager = request.data.get('is_content_manager')
        category_id = request.data.get('category_id') # category ID passed from admin dropdown
        
        if not mobile:
            return Response({"detail": "رقم الجوال مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(mobile=mobile)
            updated_fields = []
            
            if is_approved is not None:
                user.is_approved = bool(is_approved)
                user.save()
                updated_fields.append("حالة التفعيل")
                
            if is_reviewer is not None:
                user.is_reviewer = bool(is_reviewer)
                user.save()
                updated_fields.append("صلاحية المراجع")
                
            if is_content_manager is not None:
                user.is_content_manager = bool(is_content_manager)
                user.save()
                updated_fields.append("مدير المحتوى")
                
            if category_id is not None:
                try:
                    profile = user.profile
                    if category_id == "" or category_id is None:
                        profile.category = None
                        profile.is_category_manual = False
                    else:
                        category = Category.objects.get(id=category_id)
                        profile.category = category
                        profile.is_category_manual = True
                    profile.save()
                    updated_fields.append("الفئة الرياضية")
                except UserProfile.DoesNotExist:
                    return Response({"detail": "الملف الشخصي غير موجود لهذا المستخدم لإسناد فئة له."}, status=status.HTTP_400_BAD_REQUEST)
                except Category.DoesNotExist:
                    return Response({"detail": "الفئة المحددة غير موجودة."}, status=status.HTTP_400_BAD_REQUEST)
            
            if updated_fields:
                return Response({
                    "mobile": user.mobile,
                    "is_approved": user.is_approved,
                    "detail": f"تم تحديث {', '.join(updated_fields)} بنجاح."
                }, status=status.HTTP_200_OK)
                
            return Response({"detail": "لم يتم إرسال أي تعديلات لحالة التفعيل أو الفئة."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({"detail": "المستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)


class CategoryListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        categories = Category.objects.all()
        data = [{"id": c.id, "name": c.name, "code": c.code} for c in categories]
        return Response(data, status=status.HTTP_200_OK)


class AdminAddPointsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        mobile = request.data.get('mobile')
        amount = request.data.get('amount')
        description = request.data.get('description', 'نقاط مكافأة من الإدارة')
        
        if not mobile or amount is None:
            return Response({"detail": "رقم الجوال وعدد النقاط مطلوبة."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            amount = int(amount)
        except ValueError:
            return Response({"detail": "عدد النقاط يجب أن يكون رقماً صحيحاً."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(mobile=mobile)
            
            # Create transaction
            PointsTransaction.objects.create(
                user=user,
                amount=amount,
                transaction_type='admin_adjustment',
                description=description,
                created_by=request.user
            )
            
            # Read updated points from profile
            profile = user.profile
            
            return Response({
                "mobile": user.mobile,
                "points": profile.points,
                "detail": f"تمت إضافة {amount} نقطة مكافأة بنجاح."
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "المستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
            return Response({"detail": "الملف الشخصي للمستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)


class AdminAddWalkView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        mobile = request.data.get('mobile')
        km = request.data.get('km')
        points = request.data.get('points')
        description = request.data.get('description', 'نشاط مشي معتمد')

        if not mobile or km is None or points is None:
            return Response({"detail": "رقم الجوال والمسافة (كم) وعدد النقاط مطلوبة."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from decimal import Decimal
            km = Decimal(str(km))
            if km < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({"detail": "المسافة (كم) يجب أن تكون رقماً موجباً."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            points = int(points)
            if points < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({"detail": "عدد النقاط يجب أن يكون رقماً صحيحاً موجباً."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(mobile=mobile)
            profile = user.profile

            # 1. Update kilometers on user profile
            profile.total_km += km
            profile.save() # This triggers automatic category update (if not manual)

            # 2. Create PointsTransaction
            PointsTransaction.objects.create(
                user=user,
                amount=points,
                km=km,
                transaction_type='walk_activity',
                description=description,
                created_by=request.user
            )

            # Refresh profile from db to get latest cached points and level info
            profile.refresh_from_db()
            serializer = UserProfileSerializer(profile, context={'request': request})

            return Response({
                "mobile": user.mobile,
                "total_km": float(profile.total_km),
                "points": profile.points,
                "level_number": serializer.data['level_number'],
                "level_name_ar": serializer.data['level_name_ar'],
                "detail": f"تم تسجيل {km} كم وإضافة {points} نقطة بنجاح."
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "المستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
            return Response({"detail": "الملف الشخصي للمستخدم غير موجود."}, status=status.HTTP_404_NOT_FOUND)


class EventListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        events = Event.objects.filter(is_active=True).order_by('-created_at')
        user = request.user if request.user.is_authenticated else None
        
        data = []
        for ev in events:
            status_str = None
            if user:
                attendance = EventAttendance.objects.filter(user=user, event=ev).first()
                status_str = attendance.status if attendance else None
            data.append({
                "id": ev.id,
                "name_ar": ev.name_ar,
                "name_en": ev.name_en,
                "description_ar": ev.description_ar,
                "description_en": ev.description_en,
                "points": ev.points,
                "km": float(ev.km),
                "image": request.build_absolute_uri(ev.image.url) if ev.image else None,
                "event_date": ev.event_date.isoformat() if ev.event_date else None,
                "event_time": ev.event_time.strftime("%H:%M") if ev.event_time else None,
                "location_name": ev.location_name,
                "location_url": ev.location_url,
                "is_active": ev.is_active,
                "is_expired": ev.is_expired,
                "attendance_status": status_str
            })
        return Response(data, status=status.HTTP_200_OK)


class EventRegisterAttendanceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        event_id = request.data.get('event_id')
        if not event_id:
            return Response({"detail": "معرف الفعالية (event_id) مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            event = Event.objects.get(id=event_id, is_active=True)
        except Event.DoesNotExist:
            return Response({"detail": "الفعالية غير موجودة أو غير نشطة."}, status=status.HTTP_404_NOT_FOUND)
            
        # Check if expired
        if event.is_expired:
            return Response({"detail": "عذراً، لقد انتهى وقت التسجيل والحضور في هذه الفعالية."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if already registered
        attendance, created = EventAttendance.objects.get_or_create(
            user=request.user,
            event=event,
            defaults={"status": "approved"}
        )
        
        if not created:
            return Response({"detail": "لقد قمت بالانضمام لهذه الفعالية مسبقاً."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({
            "id": attendance.id,
            "status": attendance.status,
            "detail": "تم الانضمام للفعالية بنجاح."
        }, status=status.HTTP_201_CREATED)


class AdminEventsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        events = Event.objects.all().order_by('-created_at')
        data = []
        for ev in events:
            data.append({
                "id": ev.id,
                "name_ar": ev.name_ar,
                "name_en": ev.name_en,
                "description_ar": ev.description_ar,
                "description_en": ev.description_en,
                "points": ev.points,
                "km": float(ev.km),
                "image": request.build_absolute_uri(ev.image.url) if ev.image else None,
                "event_date": ev.event_date.isoformat() if ev.event_date else None,
                "event_time": ev.event_time.strftime("%H:%M") if ev.event_time else None,
                "location_name": ev.location_name,
                "location_url": ev.location_url,
                "is_active": ev.is_active,
                "is_expired": ev.is_expired
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        name_ar = request.data.get('name_ar')
        name_en = request.data.get('name_en')
        description_ar = request.data.get('description_ar', '')
        description_en = request.data.get('description_en', '')
        points = request.data.get('points', 0)
        km = request.data.get('km', 0.0)
        
        is_active_val = request.data.get('is_active', True)
        if isinstance(is_active_val, str):
            is_active = is_active_val.lower() == 'true'
        else:
            is_active = bool(is_active_val)

        event_date = request.data.get('event_date')
        event_time = request.data.get('event_time')
        location_name = request.data.get('location_name')
        location_url = request.data.get('location_url')
        image = request.data.get('image')

        # Clean empty strings
        if not event_date: event_date = None
        if not event_time: event_time = None
        if not location_name: location_name = None
        if not location_url: location_url = None
        if not image: image = None

        if not name_ar or not name_en:
            return Response({"detail": "اسم الفعالية بالعربية والإنجليزية مطلوب."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            points = int(points)
            from decimal import Decimal
            km = Decimal(str(km))
        except (ValueError, TypeError):
            return Response({"detail": "النقاط والمسافة يجب أن تكون أرقام صالحة."}, status=status.HTTP_400_BAD_REQUEST)

        event = Event.objects.create(
            name_ar=name_ar,
            name_en=name_en,
            description_ar=description_ar,
            description_en=description_en,
            points=points,
            km=km,
            image=image,
            event_date=event_date,
            event_time=event_time,
            location_name=location_name,
            location_url=location_url,
            is_active=is_active
        )

        # Automatically save location as template if it's new and has name + url
        if location_name and location_url:
            EventLocation.objects.get_or_create(
                location_url=location_url,
                defaults={
                    'name_ar': location_name,
                    'name_en': location_name # Using same for EN if not provided separately
                }
            )

        return Response({
            "id": event.id,
            "name_ar": event.name_ar,
            "detail": "تم إنشاء الفعالية بنجاح."
        }, status=status.HTTP_201_CREATED)


class AdminEventAttendeesView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        event_id = request.query_params.get('event_id')
        if event_id:
            attendances = EventAttendance.objects.filter(event_id=event_id, status='approved').select_related('user', 'user__profile', 'event').order_by('-registered_at')
        else:
            attendances = EventAttendance.objects.filter(status='approved').select_related('user', 'user__profile', 'event').order_by('-registered_at')

        data = []
        for att in attendances:
            try:
                profile_name = att.user.profile.name
            except UserProfile.DoesNotExist:
                profile_name = "عضو جديد"

            data.append({
                "id": att.id,
                "mobile": att.user.mobile,
                "user_name": profile_name,
                "event_id": att.event.id,
                "event_name_ar": att.event.name_ar,
                "registered_at": att.registered_at
            })
        return Response(data, status=status.HTTP_200_OK)


class AdminEventCloseView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        event_id = request.data.get('event_id')
        if not event_id:
            return Response({"detail": "معرف الفعالية مطلوب."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({"detail": "الفعالية غير موجودة."}, status=status.HTTP_404_NOT_FOUND)

        if not event.is_active:
            return Response({"detail": "الفعالية مغلقة مسبقاً."}, status=status.HTTP_400_BAD_REQUEST)

        attendances = EventAttendance.objects.filter(event=event, status='approved').select_related('user', 'user__profile')
        from django.db import transaction
        from decimal import Decimal

        with transaction.atomic():
            for attendance in attendances:
                user = attendance.user

                # Give Points (and record the event distance on the same ledger row)
                if event.points > 0 or event.km > 0:
                    PointsTransaction.objects.create(
                        user=user,
                        amount=event.points,
                        km=event.km,
                        transaction_type='event_attendance',
                        description=f"مكافأة حضور الفعالية: {event.name_ar}",
                        source_type='event',
                        source_id=event.id,
                        created_by=request.user
                    )

                # Give KM
                if event.km > 0:
                    try:
                        profile = user.profile
                        profile.total_km += Decimal(str(event.km))
                        profile.save(update_fields=['total_km'])
                    except UserProfile.DoesNotExist:
                        pass

            event.is_active = False
            event.save(update_fields=['is_active'])

        return Response({"detail": f"تم إنهاء الفعالية وتوزيع الجوائز على {attendances.count()} مشارك بنجاح."}, status=status.HTTP_200_OK)


class AdminEventLocationView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        locations = EventLocation.objects.all().order_by('-created_at')
        data = [{
            "id": loc.id,
            "name_ar": loc.name_ar,
            "name_en": loc.name_en,
            "location_url": loc.location_url
        } for loc in locations]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        name_ar = request.data.get('name_ar')
        name_en = request.data.get('name_en', name_ar)
        location_url = request.data.get('location_url')

        if not name_ar or not location_url:
            return Response({"detail": "الاسم ورابط الخريطة مطلوبان."}, status=status.HTTP_400_BAD_REQUEST)

        loc, created = EventLocation.objects.get_or_create(
            location_url=location_url,
            defaults={'name_ar': name_ar, 'name_en': name_en}
        )
        if not created:
            # Update existing if needed
            loc.name_ar = name_ar
            loc.name_en = name_en
            loc.save()

        return Response({
            "id": loc.id,
            "name_ar": loc.name_ar,
            "name_en": loc.name_en,
            "location_url": loc.location_url,
            "detail": "تم حفظ الموقع بنجاح."
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        loc_id = request.data.get('id')
        if not loc_id:
            return Response({"detail": "معرف الموقع مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            loc = EventLocation.objects.get(id=loc_id)
            loc.delete()
            return Response({"detail": "تم حذف الموقع بنجاح."}, status=status.HTTP_200_OK)
        except EventLocation.DoesNotExist:
            return Response({"detail": "الموقع غير موجود."}, status=status.HTTP_404_NOT_FOUND)


class AdminImportMembersView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({"detail": "يرجى إرفاق ملف الإكسيل."}, status=status.HTTP_400_BAD_REQUEST)
        
        excel_file = request.FILES['file']
        
        try:
            import pandas as pd
            df = pd.read_excel(excel_file)
        except Exception as e:
            return Response({"detail": f"خطأ في قراءة ملف الإكسيل: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Expected columns: Email, Name, Phone, Age, Height, Weight, Points, Distance (Km), Details
        required_cols = ['Name', 'Phone']
        for col in required_cols:
            if col not in df.columns:
                return Response({"detail": f"العمود {col} غير موجود في الملف."}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import date
        current_year = date.today().year

        added_count = 0
        updated_count = 0

        for index, row in df.iterrows():
            try:
                phone = str(row['Phone']).strip()
                if not phone or phone == 'nan':
                    continue
                
                # Format phone (remove decimals if read as float)
                if phone.endswith('.0'):
                    phone = phone[:-2]
                
                # Create or get user
                user, created = User.objects.get_or_create(mobile=phone)
                user.is_approved = True  # Auto approve imported members
                user.save()

                name = str(row.get('Name', '')).strip()
                email = str(row.get('Email', '')).strip()
                if email == 'nan': email = ''

                # Calculate birth_date from age
                age_val = row.get('Age')
                birth_date = None
                if pd.notna(age_val):
                    try:
                        age = int(age_val)
                        birth_date = date(current_year - age, 1, 1)
                    except ValueError:
                        pass

                height_val = row.get('Height')
                height = float(height_val) if pd.notna(height_val) else None

                weight_val = row.get('Weight')
                weight = float(weight_val) if pd.notna(weight_val) else None

                points_val = row.get('Points')
                points = int(points_val) if pd.notna(points_val) else 0

                distance_val = row.get('Distance (Km)')
                distance = float(distance_val) if pd.notna(distance_val) else 0.0

                details = str(row.get('Details', '')).strip()
                if details == 'nan': details = ''

                profile, p_created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'name': name,
                        'email': email,
                        'birth_date': birth_date,
                        'height': height,
                        'weight': weight,
                        'points': points,
                        'total_km': distance,
                        'health_notes': details,
                        'gender': 'male', # Default
                        'city': 'الخبر' # Default
                    }
                )

                if not p_created:
                    # Update existing profile
                    profile.name = name
                    if email: profile.email = email
                    if birth_date: profile.birth_date = birth_date
                    if height is not None: profile.height = height
                    if weight is not None: profile.weight = weight
                    if details: profile.health_notes = details
                    # Add to existing points and distance? Or overwrite? 
                    # Assuming we overwrite if we are importing a master sheet
                    profile.points = points
                    profile.total_km = distance
                    profile.save()
                    updated_count += 1
                else:
                    added_count += 1

            except Exception as e:
                print(f"Error importing row {index}: {e}")
                continue

        return Response({
            "detail": f"تمت عملية الاستيراد بنجاح. تمت إضافة {added_count} وتحديث {updated_count} عضو."
        }, status=status.HTTP_200_OK)


class MemberActivityView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        activities = MemberActivityRequest.objects.filter(user=request.user).order_by('-created_at')
        serializer = MemberActivityRequestSerializer(activities, many=True)
        return Response(serializer.data)

    def post(self, request):
        link = request.data.get('activity_link', '')
        if not link:
            return Response({"detail": "رابط النشاط مطلوب."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if link contains strava, garmin, or relive
        valid_domains = ['strava.com', 'garmin.com', 'relive.cc', 'nike.com', 'adidas.com']
        if not any(domain in link.lower() for domain in valid_domains):
            return Response({"detail": "يرجى استخدام رابط صحيح من التطبيقات المعتمدة (Strava, Garmin, etc)."}, status=status.HTTP_400_BAD_REQUEST)

        # Check for duplicates: only block the member's own link while it is still
        # pending or already approved. Rejected links may be resubmitted, and the
        # same link shared between members (group activities) is allowed.
        if MemberActivityRequest.objects.filter(
            user=request.user,
            activity_link=link,
            status__in=['pending', 'approved']
        ).exists():
            return Response({"detail": "لقد رفعت هذا الرابط مسبقاً وهو قيد المراجعة أو معتمد."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MemberActivityRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response({"detail": "تم الرفع بنجاح! سيتم مراجعة نشاطك من الإدارة قريباً.", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IsAdminOrReviewer(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'is_reviewer', False)))

class IsAdminOrContentManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or getattr(request.user, 'is_content_manager', False)))

class AdminActivityView(views.APIView):
    permission_classes = [IsAdminOrReviewer]

    def get(self, request):
        activities = MemberActivityRequest.objects.all().order_by('-created_at')
        serializer = MemberActivityRequestSerializer(activities, many=True)
        return Response(serializer.data)

    def patch(self, request, pk=None):
        if not pk:
            return Response({"detail": "المعرف مطلوب"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            activity = MemberActivityRequest.objects.get(pk=pk)
        except MemberActivityRequest.DoesNotExist:
            return Response({"detail": "النشاط غير موجود"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in ['approved', 'rejected', 'pending']:
            return Response({"detail": "حالة غير صحيحة"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure it's not already processed
        if activity.status != 'pending' and new_status != 'pending':
            return Response({"detail": "تمت معالجة هذا الطلب مسبقاً."}, status=status.HTTP_400_BAD_REQUEST)

        if new_status == 'approved':
            approved_km = request.data.get('approved_km')
            approved_points = request.data.get('approved_points')

            if approved_km is None or approved_km == '':
                return Response({"detail": "يجب تحديد الكيلومترات المعتمدة عند الموافقة."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                approved_km_val = Decimal(str(approved_km))
                if approved_km_val < 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return Response({"detail": "المسافة المعتمدة يجب أن تكون رقماً موجباً."}, status=status.HTTP_400_BAD_REQUEST)

            # H3: derive points from the configurable km rate when the reviewer leaves it blank.
            settings_obj = PointsSettings.get_settings()
            applied_rate = settings_obj.km_points_rate
            if approved_points is None or approved_points == '':
                approved_points_val = int(round(float(approved_km_val) * float(applied_rate)))
            else:
                try:
                    approved_points_val = int(approved_points)
                    if approved_points_val < 0:
                        raise ValueError()
                except (ValueError, TypeError):
                    return Response({"detail": "النقاط المعتمدة يجب أن تكون رقماً صحيحاً موجباً."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                profile = activity.user.profile
            except UserProfile.DoesNotExist:
                return Response({"detail": "لا يمكن الاعتماد: ملف العضو غير مكتمل."}, status=status.HTTP_400_BAD_REQUEST)

            # C1: keep status, points and km consistent — either all succeed or none.
            with transaction.atomic():
                activity.approved_km = approved_km_val
                activity.approved_points = approved_points_val
                activity.status = 'approved'
                activity.reviewed_by = request.user
                activity.save()

                # Add points via PointsTransaction which also updates UserProfile.points
                PointsTransaction.objects.create(
                    user=activity.user,
                    amount=approved_points_val,
                    km=approved_km_val,
                    transaction_type='walk_activity',
                    description=f"اعتماد نشاط حر: {activity.activity_name}",
                    applied_rate=applied_rate,
                    source_type='activity',
                    source_id=activity.id,
                    created_by=request.user
                )

                # Add km
                profile.total_km += approved_km_val
                profile.save(update_fields=['total_km'])

        elif new_status == 'rejected':
            activity.status = 'rejected'
            activity.reviewed_by = request.user
            activity.save()
            
        elif new_status == 'pending':
            activity.status = 'pending'
            activity.reviewed_by = None
            activity.save()

        serializer = MemberActivityRequestSerializer(activity)
        return Response(serializer.data)

class AdminPointsSettingsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        settings = PointsSettings.get_settings()
        from .serializers import PointsSettingsSerializer
        serializer = PointsSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = PointsSettings.get_settings()
        from .serializers import PointsSettingsSerializer
        serializer = PointsSettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LeaderboardView(views.APIView):
    """
    Public leaderboard view to retrieve top users.
    Supports sorting by points, km, or streak.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        sort_by = request.query_params.get('sort_by', 'points') # points, km, streak
        
        # Base query: only approved users
        queryset = UserProfile.objects.filter(user__is_approved=True).select_related('user', 'category')
        
        if sort_by == 'km':
            queryset = queryset.order_by('-total_km', '-points', '-streak')
        elif sort_by == 'streak':
            queryset = queryset.order_by('-streak', '-points', '-total_km')
        else:
            # Default to points
            queryset = queryset.order_by('-points', '-total_km', '-streak')
            
        # Top 50 members to keep it fast and competitive
        profiles = queryset[:50]

        # Serialize with a public-safe projection (no PII / health fields)
        serializer = LeaderboardSerializer(profiles, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser
from .models import NewsPost, NewsLike

class NewsListView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        news_type = request.query_params.get('type')
        qs = NewsPost.objects.filter(status='approved')
        if news_type in ['member', 'team']:
            qs = qs.filter(news_type=news_type)
        news = qs.order_by('-created_at')
        
        data = []
        user_id = request.user.id if request.user.is_authenticated else None
        
        for post in news:
            likes_count = post.likes.count()
            user_liked = False
            if user_id:
                user_liked = post.likes.filter(user_id=user_id).exists()
            
            data.append({
                'id': post.id,
                'title': post.title,
                'content': post.content,
                'image': request.build_absolute_uri(post.image.url) if post.image else None,
                'author_name': post.author.profile.name if hasattr(post.author, 'profile') else 'أدمن',
                'created_at': post.created_at,
                'likes_count': likes_count,
                'user_liked': user_liked,
                'news_type': post.news_type,
            })
        return Response(data)

class NewsDetailView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, post_id):
        post = get_object_or_404(NewsPost, id=post_id, status='approved')
        likes_count = post.likes.count()
        user_liked = False
        if request.user.is_authenticated:
            user_liked = post.likes.filter(user_id=request.user.id).exists()
            
        data = {
            'id': post.id,
            'title': post.title,
            'content': post.content,
            'image': request.build_absolute_uri(post.image.url) if post.image else None,
            'author_name': post.author.profile.name if hasattr(post.author, 'profile') else 'أدمن',
            'created_at': post.created_at,
            'likes_count': likes_count,
            'user_liked': user_liked,
        }
        return Response(data)
class NewsCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        title = request.data.get('title')
        content = request.data.get('content')
        image = request.FILES.get('image')
        
        if not title or not content:
            return Response({"detail": "العنوان والمحتوى مطلوبان."}, status=status.HTTP_400_BAD_REQUEST)
        
        status_val = 'approved' if request.user.is_staff else 'pending'
        
        post = NewsPost.objects.create(
            author=request.user,
            title=title,
            content=content,
            image=image,
            status=status_val
        )
        msg = "تم نشر الخبر بنجاح." if status_val == 'approved' else "تم إرسال مشاركتك وتنتظر المراجعة من الإدارة."
        return Response({"detail": msg}, status=status.HTTP_201_CREATED)

class NewsLikeToggleView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, post_id):
        post = get_object_or_404(NewsPost, id=post_id, status='approved')
        like, created = NewsLike.objects.get_or_create(user=request.user, post=post)
        if not created:
            like.delete()
            return Response({"detail": "تم إزالة الإعجاب.", "liked": False})
        return Response({"detail": "تم الإعجاب.", "liked": True})

class AdminPendingNewsView(views.APIView):
    permission_classes = [IsAdminOrContentManager]
    def get(self, request):
        pending = NewsPost.objects.filter(status='pending').order_by('created_at')
        data = [{
            'id': p.id,
            'title': p.title,
            'content': p.content,
            'author_name': p.author.profile.name if hasattr(p.author, 'profile') else 'عضو',
            'author_mobile': p.author.mobile,
            'image': request.build_absolute_uri(p.image.url) if p.image else None,
            'created_at': p.created_at
        } for p in pending]
        return Response(data)

class AdminReviewNewsView(views.APIView):
    permission_classes = [IsAdminOrContentManager]
    def post(self, request):
        post_id = request.data.get('post_id')
        new_status = request.data.get('status')
        if not post_id or new_status not in ['approved', 'rejected']:
            return Response({"detail": "بيانات غير صالحة."}, status=status.HTTP_400_BAD_REQUEST)
        
        post = get_object_or_404(NewsPost, id=post_id)
        previously_approved = post.status == 'approved'
        post.status = new_status
        post.save()

        # Award content-creation points to the author, using the amount configured
        # by the admin in Points Settings. Granted once, only on first approval.
        awarded_points = 0
        if new_status == 'approved' and not previously_approved:
            content_points = PointsSettings.get_settings().content_points or 0
            already_awarded = PointsTransaction.objects.filter(
                source_type='news', source_id=post.id, transaction_type='content_creation'
            ).exists()
            if content_points > 0 and not already_awarded:
                PointsTransaction.objects.create(
                    user=post.author,
                    amount=content_points,
                    transaction_type='content_creation',
                    description=f"اعتماد محتوى: {post.title}",
                    source_type='news',
                    source_id=post.id,
                    created_by=request.user
                )
                awarded_points = content_points

        if awarded_points:
            return Response({
                "detail": f"تم نشر الخبر ومنح الناشر {awarded_points} نقطة محتوى.",
                "awarded_points": awarded_points
            })
        return Response({"detail": "تم تحديث حالة الخبر.", "awarded_points": 0})

class PublicStatsView(views.APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        total_users = UserProfile.objects.filter(user__is_approved=True).count()
        total_events = Event.objects.filter(is_active=False).count()
        
        total_km_aggregate = UserProfile.objects.aggregate(total=Sum('total_km'))['total']
        total_km = float(total_km_aggregate) if total_km_aggregate else 0.0
        
        settings = PointsSettings.get_settings()
        
        return Response({
            'total_users': total_users,
            'total_events': total_events,
            'total_km': total_km,
            'annual_goal_km': settings.annual_goal_km,
        })


class PublicUpcomingEventsView(views.APIView):
    """Public list of active, not-yet-expired events ordered by closeness (nearest first)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        from datetime import date as _date, time as _time

        events = [ev for ev in Event.objects.filter(is_active=True) if not ev.is_expired]
        # Nearest first; dated events come before undated ones.
        events.sort(key=lambda ev: (
            ev.event_date is None,
            ev.event_date or _date.max,
            ev.event_time or _time.min,
        ))

        data = [{
            "id": ev.id,
            "name_ar": ev.name_ar,
            "description_ar": ev.description_ar,
            "points": ev.points,
            "km": float(ev.km),
            "image": request.build_absolute_uri(ev.image.url) if ev.image else None,
            "event_date": ev.event_date.isoformat() if ev.event_date else None,
            "event_time": ev.event_time.strftime("%H:%M") if ev.event_time else None,
            "location_name": ev.location_name,
            "location_url": ev.location_url,
        } for ev in events]

        return Response(data, status=status.HTTP_200_OK)


class MonthlyCategoryChampionsView(views.APIView):
    """
    Top 3 walkers (by km walked in the CURRENT calendar month) for each category.
    Because it filters on the current month, the board resets automatically at the
    start of every Gregorian month — no scheduled job needed.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        now = timezone.localtime()
        year, month = now.year, now.month

        # The four groups used by the auto-classification system.
        GROUP_CODES = ['youth', 'ladies', 'seniors', 'special_needs']

        result = []
        for cat in Category.objects.filter(code__in=GROUP_CODES).order_by('id'):
            rows = (
                PointsTransaction.objects
                .filter(
                    created_at__year=year,
                    created_at__month=month,
                    km__gt=0,
                    user__is_approved=True,
                    user__profile__category=cat,
                )
                .values('user')
                .annotate(month_km=Sum('km'))
                .order_by('-month_km')[:3]
            )

            top = []
            for row in rows:
                try:
                    profile = UserProfile.objects.select_related('user').get(user_id=row['user'])
                except UserProfile.DoesNotExist:
                    continue
                top.append({
                    "name": profile.name,
                    "avatar": request.build_absolute_uri(profile.avatar.url) if profile.avatar else None,
                    "km": float(row['month_km'] or 0),
                })

            result.append({
                "category_name": cat.name,
                "category_code": cat.code,
                "top": top,
            })

        return Response({
            "month": month,
            "year": year,
            "categories": result,
        }, status=status.HTTP_200_OK)


class DevLoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Allow dev login if explicitly enabled via env var (useful for staging/demo)
        from django.conf import settings
        dev_login_enabled = os.environ.get('DEV_LOGIN_ENABLED', 'True' if settings.DEBUG else 'False') == 'True'
        if not dev_login_enabled:
            return Response({"detail": "هذه الميزة متاحة فقط في بيئة التطوير."}, status=status.HTTP_403_FORBIDDEN)
            
        role = request.data.get('role')
        if role not in ['admin', 'reviewer', 'content_manager']:
            return Response({"detail": "دور غير صالح."}, status=status.HTTP_400_BAD_REQUEST)
            
        mobile = None
        if role == 'admin':
            mobile = '0500000001'
        elif role == 'reviewer':
            mobile = '0500000002'
        elif role == 'content_manager':
            mobile = '0500000003'
            
        user, created = User.objects.get_or_create(mobile=mobile)
        if created:
            user.is_approved = True
            if role == 'admin':
                user.is_staff = True
                user.is_superuser = True
            elif role == 'reviewer':
                user.is_reviewer = True
            elif role == 'content_manager':
                user.is_content_manager = True
            user.set_unusable_password()
            user.save()
            
            # Create a profile
            names = {
                'admin': 'مدير النظام (اختبار)',
                'reviewer': 'مدقق الأنشطة (اختبار)',
                'content_manager': 'مدير المحتوى (اختبار)'
            }
            UserProfile.objects.create(
                user=user,
                name=names[role],
                gender='male',
                city='الدمام',
                preferred_activity='walk'
            )
            
        token, _ = Token.objects.get_or_create(user=user)
        has_profile = hasattr(user, 'profile')
        
        return Response({
            "token": token.key,
            "is_new_user": not has_profile,
            "is_approved": user.is_approved,
            "mobile": user.mobile,
            "is_admin": user.is_staff,
            "is_reviewer": getattr(user, 'is_reviewer', False),
            "is_content_manager": getattr(user, 'is_content_manager', False)
        }, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Invalidate the auth token server-side so a logged-out token cannot be reused.
        Token.objects.filter(user=request.user).delete()
        return Response({"detail": "تم تسجيل الخروج بنجاح."}, status=status.HTTP_200_OK)
