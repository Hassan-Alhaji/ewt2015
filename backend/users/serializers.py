import random
import re
from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings
from .models import UserProfile, OTPLogin, Category, MemberActivityRequest, PointsSettings
from .progression import get_level_info

User = get_user_model()

class OTPSendSerializer(serializers.Serializer):
    mobile = serializers.CharField(max_length=20)

    def validate_mobile(self, value):
        # Clean mobile number (keep only digits, and optionally a leading +)
        cleaned = re.sub(r'[^\d+]', '', value)
        if not cleaned:
            raise serializers.ValidationError("رقم الجوال غير صالح.")
        # Ensure it contains at least 9 digits (local Saudi mobile numbers are 9-10 digits, or with country code)
        if len(cleaned) < 9:
            raise serializers.ValidationError("رقم الجوال قصير جداً.")
        return cleaned

    def save(self):
        mobile = self.validated_data['mobile']
        # Generate 6-digit random code
        code = str(random.randint(100000, 999999))
        
        # Calculate expiry
        expiry = timezone.now() + timezone.timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        # Save OTP to database
        otp_instance = OTPLogin.objects.create(
            mobile=mobile,
            code=code,
            expires_at=expiry
        )
        
        # OTP simulation/sending logic
        if getattr(settings, 'OTP_SIMULATION_MODE', False):
            # In simulation, we print to terminal and we will return it in response (since it's dev mode)
            print(f"\n========================================")
            print(f"OTP Code generated for {mobile}: {code}")
            print(f"========================================\n")
            return otp_instance, code
        else:
            # Here we would call SMS or WhatsApp API
            # sms_provider.send_otp(mobile, code)
            return otp_instance, None


class OTPVerifySerializer(serializers.Serializer):
    mobile = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, data):
        mobile = data.get('mobile')
        code = data.get('code')
        
        # Find matching OTP code that is unused and not expired
        otp = OTPLogin.objects.filter(
            mobile=mobile,
            code=code,
            is_used=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()
        
        if not otp:
            raise serializers.ValidationError("رمز التحقق غير صحيح أو انتهت صلاحيته.")
        
        data['otp_instance'] = otp
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(source='user.mobile', read_only=True)
    is_approved = serializers.BooleanField(source='user.is_approved', read_only=True)
    is_reviewer = serializers.BooleanField(source='user.is_reviewer', read_only=True)
    is_content_manager = serializers.BooleanField(source='user.is_content_manager', read_only=True)
    
    # Category details
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), required=False, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    
    # Progression properties
    level_number = serializers.SerializerMethodField()
    level_name_ar = serializers.SerializerMethodField()
    level_name_en = serializers.SerializerMethodField()
    next_level_min_km = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    
    # Dynamic age
    age = serializers.ReadOnlyField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'mobile', 'name', 'avatar', 'gender', 'birth_date', 'age',
            'city', 'email', 'height', 'weight', 'health_notes', 'is_disabled',
            'preferred_activity', 'is_approved', 'is_reviewer', 'is_content_manager', 'created_at',
            'category', 'category_name', 'category_code', 'is_category_manual',
            'total_km', 'points', 'streak', 'level_number', 'level_name_ar',
            'level_name_en', 'next_level_min_km', 'progress_percent'
        ]
        read_only_fields = ['id', 'created_at']

    def _get_lvl_data(self, obj):
        if not hasattr(obj, '_level_info'):
            obj._level_info = get_level_info(obj.total_km)
        return obj._level_info

    def get_level_number(self, obj):
        return self._get_lvl_data(obj)["level_number"]

    def get_level_name_ar(self, obj):
        return self._get_lvl_data(obj)["level_name_ar"]

    def get_level_name_en(self, obj):
        return self._get_lvl_data(obj)["level_name_en"]

    def get_next_level_min_km(self, obj):
        return self._get_lvl_data(obj)["next_level_min_km"]

    def get_progress_percent(self, obj):
        return self._get_lvl_data(obj)["progress_percent"]

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        
        # Privacy filter: Hide weight and health notes unless the request is from the owner or staff/admin
        if request and request.user:
            if request.user.is_staff or request.user == instance.user:
                # User is allowed to see the private fields
                pass
            else:
                representation.pop('height', None)
                representation.pop('weight', None)
                representation.pop('health_notes', None)
        else:
            # Not authenticated or no request context, remove private fields
            representation.pop('height', None)
            representation.pop('weight', None)
            representation.pop('health_notes', None)
            
        return representation

class LeaderboardSerializer(serializers.ModelSerializer):
    """
    Public-safe projection of a member profile for the leaderboard.
    Deliberately excludes PII (email, birth_date, age, mobile) and the
    private health fields (weight, health_notes).
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    level_number = serializers.SerializerMethodField()
    level_name_ar = serializers.SerializerMethodField()
    level_name_en = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'name', 'avatar', 'gender', 'city',
            'category_name', 'category_code',
            'total_km', 'points', 'streak',
            'level_number', 'level_name_ar', 'level_name_en', 'progress_percent',
        ]

    def _get_lvl_data(self, obj):
        if not hasattr(obj, '_level_info'):
            obj._level_info = get_level_info(obj.total_km)
        return obj._level_info

    def get_level_number(self, obj):
        return self._get_lvl_data(obj)["level_number"]

    def get_level_name_ar(self, obj):
        return self._get_lvl_data(obj)["level_name_ar"]

    def get_level_name_en(self, obj):
        return self._get_lvl_data(obj)["level_name_en"]

    def get_progress_percent(self, obj):
        return self._get_lvl_data(obj)["progress_percent"]


class MemberActivityRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.profile.name', read_only=True)
    user_mobile = serializers.CharField(source='user.mobile', read_only=True)

    class Meta:
        model = MemberActivityRequest
        fields = '__all__'
        read_only_fields = ['id', 'user', 'status', 'approved_km', 'approved_points', 'reviewed_by', 'created_at', 'updated_at']

class PointsSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsSettings
        fields = '__all__'
