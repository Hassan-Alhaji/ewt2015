from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, OTPLogin

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name = 'ملف العضو'
    verbose_name_plural = 'ملف العضو الشخصي'

class UserAdmin(BaseUserAdmin):
    list_display = ('mobile', 'is_approved', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_approved', 'is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('mobile', 'password')}),
        ('الصلاحيات وحالة الحساب', {'fields': ('is_approved', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('التواريخ', {'fields': ('last_login', 'date_joined')}),
    )
    search_fields = ('mobile',)
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions')
    inlines = (UserProfileInline,)

admin.site.register(User, UserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'user_mobile', 'gender', 'city', 'is_disabled', 'preferred_activity')
    search_fields = ('name', 'user__mobile', 'city')
    list_filter = ('gender', 'is_disabled', 'preferred_activity', 'city')

    def user_mobile(self, obj):
        return obj.user.mobile
    user_mobile.short_description = 'رقم الجوال'

@admin.register(OTPLogin)
class OTPLoginAdmin(admin.ModelAdmin):
    list_display = ('mobile', 'code', 'is_used', 'expires_at', 'created_at')
    list_filter = ('is_used', 'expires_at')
    search_fields = ('mobile', 'code')
    readonly_fields = ('mobile', 'code', 'created_at', 'expires_at')
